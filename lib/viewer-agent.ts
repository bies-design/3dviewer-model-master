import { viewerApi } from "./viewer-api";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export class ViewerAgent {
  private conversationHistory: Message[] = [];

  constructor(systemPrompt: string) {
    this.conversationHistory.push({ role: "system", content: systemPrompt });
  }

  async sendMessage(prompt: string): Promise<string> {
    this.conversationHistory.push({ role: "user", content: prompt });

    const response = await fetch(`${process.env.NEXT_PUBLIC_OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_OPENAI_MODEL_ID,
        messages: this.conversationHistory,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    this.conversationHistory.push({ role: "assistant", content: aiResponse });

    try {
      const command = JSON.parse(aiResponse);
      if (command.action) {
        const result = await this.executeCommand(command);
        return result;
      }
    } catch (error) {
      // It's a natural language response, or a markdown block
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const match = aiResponse.match(jsonRegex);
      if (match && match[1]) {
        try {
          const command = JSON.parse(match[1]);
          if (command.action) {
            const result = await this.executeCommand(command);
            return result;
          }
        } catch (e) {
          // Not a valid JSON, so it's a natural language response
        }
      }
    }

    return aiResponse;
  }

  private async executeCommand(command: any): Promise<string> {
    if (command.action === "highlight" && command.target) {
      await viewerApi.highlightElement(command.target);
      return `Highlighted element(s)`;
    }
    if (command.action === "get_properties" && command.target) {
      const props = await viewerApi.getElementProperties(command.target);
      return JSON.stringify(props, null, 2);
    }
    if (command.action === "find_elements" && command.attribute && command.value) {
      const elementIds = await viewerApi.findElementsByAttribute(command.attribute, command.value, command.operator);
      if (elementIds.length > 0) {
        await viewerApi.highlightElement(elementIds);
        return `Found and highlighted ${elementIds.length} element(s).`;
      }
      return `No elements found with ${command.attribute} = ${command.value}.`;
    }
    return "Unknown command.";
  }
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Spinner } from "@heroui/react";
import { ViewerAgent } from "@/lib/viewer-agent";

export default function AIPanel({ darkMode }: { darkMode: boolean }) {
  const { t } = useTranslation();
  const { viewerApi } = useAppContext();
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "ai" }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const attrs = await viewerApi.getAllAttributes();
      setAttributes(attrs);
      const cats = await viewerApi.getAllCategories();
      setCategories(cats);
    };
    fetchData();
  }, [viewerApi]);

  const agent = useMemo(() => {
    const systemPrompt = `You are an AI assistant for a 3D model viewer. Your goal is to help users explore and understand the model.

You have access to the following tools:
- \`highlightElement(elementIds: string | string[])\`: Highlights one or more elements in the viewer.
- \`getElementProperties(elementId: string)\`: Retrieves the properties of a specific element.
- \`findElementsByAttribute(attribute: string, value: string, operator: "includes" | "startsWith" | "endsWith" | "equals")\`: Finds elements based on their attributes.
- \`zoomToElement(elementIds: string | string[])\`: Zooms the camera to fit the specified elements.
- \`isolateElements(elementIds: string | string[])\`: Isolates the specified elements, hiding everything else.
- \`showAllElements()\`: Shows all elements in the model.

Available attributes in the model: ${Array.from(attributes).join(", ")}
Available categories in the model: ${categories.join(", ")}

**Your Persona:**
You are a knowledgeable and helpful guide. Be proactive in suggesting ways the user can interact with the model.

**Your Task:**
1.  Understand the user's request.
2.  If the request is clear and you can fulfill it with one of your tools, respond with a JSON object representing the tool call.
3.  If the request is ambiguous, ask clarifying questions.
4.  If you can't fulfill the request, explain why in a helpful and friendly manner.

**Example Interactions:**

*   **Simple Highlight:**
    *   User: "Highlight element ifc_uploaded_123-456"
    *   AI: \`{"action": "highlight", "target": "ifc_uploaded_123-456"}\`

*   **Attribute-based Search:**
    *   User: "Show me all the doors."
    *   AI: \`{"action": "find_elements", "attribute": "Category", "value": "door", "operator": "includes"}\`

*   **Clarification:**
    *   User: "I want to see the big window."
    *   AI: "There are several large windows in the model. Could you be more specific? For example, you can tell me which floor it's on."

*   **Unavailable Information:**
    *   User: "What's the price of this chair?"
    *   AI: "I'm sorry, but I don't have access to pricing information. However, I can tell you its dimensions if you'd like."`;
    return new ViewerAgent(systemPrompt);
  }, [attributes, categories]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const userMessage = { text: inputValue, sender: "user" as "user" | "ai" };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const aiResponse = await agent.sendMessage(inputValue);
      const aiMessage = { text: aiResponse, sender: "ai" as "user" | "ai" };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error calling AI API:", error);
      const aiMessage = { text: "Sorry, something went wrong with the AI service.", sender: "ai" as "user" | "ai" };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-4">{t("ai_panel")}</h2>
      <div className="flex-grow overflow-y-auto mb-4 p-2 border rounded-md h-full">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 my-1 rounded-md ${
              msg.sender === "user"
                ? `bg-blue-500 text-white self-end`
                : `bg-gray-700 text-white self-start`
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="p-2 my-1 rounded-md bg-gray-700 text-white self-start">
            <Spinner classNames={{ label: "text-foreground mt-4" }} variant="gradient" />
          </div>
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          className={`flex-grow p-2 border rounded-l-md ${
            darkMode ? "bg-dark-content3 text-white" : "bg-light-content3 text-black"
          }`}
        />
        <button
          onClick={handleSendMessage}
          className={`p-2 rounded-r-md ${
            darkMode ? "bg-dark-primary text-white" : "bg-light-primary text-white"
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

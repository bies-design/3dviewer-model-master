// BCFTopics.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { Calendar } from "lucide-react";

interface BCFTopicsProps {
  components: OBC.Components;
  world: OBC.World;
  darkMode: boolean;
  bcfMode: boolean;
  setBcfMode: (enabled: boolean) => void;
  selectedModelId: string | null;
  selectedLocalId: number | null;
}

interface CreateTopicFormData {
  title: string;
  description: string;
  type: string;
  priority: string;
  stage: string;
  labels: string;
  assignedTo: string;
  dueDate: string;
}

interface HistoryRecord {
  before: any;
  after: any;
  editor: string;
  timestamp: string;
}

interface ExtendedTopic extends OBC.Topic {
  history?: HistoryRecord[];
}

const BCFTopics: React.FC<BCFTopicsProps> = ({ components, world, darkMode, bcfMode, setBcfMode, selectedModelId, selectedLocalId }) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [bcfTopics, setBcfTopics] = useState<OBC.BCFTopics | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<OBC.Topic | null>(null);
  const [topicsList, setTopicsList] = useState<OBC.Topic[]>([]);
  const [sortCriteria, setSortCriteria] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "dsc">("dsc");
  const [collapsed, setCollapsed] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [selectionForTopic, setSelectionForTopic] = useState<Set<string> | null>(null);
  const [newComment, setNewComment] = useState({ name: "", comment: "" });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!components) return;

    const topics = components.get(OBC.BCFTopics);
    topics.setup({
      author: "signed.user@mail.com",
      users: new Set(["jhon.doe@example.com", "user_a@something.com", "user_b@something.com"]),
      labels: new Set(["Architecture", "Structure", "MEP"]),
    });

    const onTopicsChanged = () => setTopicsList([...topics.list.values()]);
    topics.list.onItemSet.add(onTopicsChanged);
    topics.list.onItemUpdated.add(onTopicsChanged);

    setBcfTopics(topics);

    return () => {
      topics.list.onItemSet.remove(onTopicsChanged);
      topics.list.onItemUpdated.remove(onTopicsChanged);
    };
  }, [components]);

  const handleEnterBcfMode = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.multiple = "shiftKey";
    await highlighter.clear();
    setBcfMode(true);
  };

  const handleConfirmBcfCreation = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const fragments = components.get(OBC.FragmentsManager);
    const currentSelection = highlighter.selection.select;

    if (Object.keys(currentSelection).length === 0) {
      alert(t("select_element_before_creating_topic"));
      setBcfMode(false);
      return;
    }

    const queries = [];
    const escapeRegExp = (string: any) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const modelId in currentSelection) {
      const model = fragments.list.get(modelId);
      if (!model) continue;

      const expressIds = Array.from(currentSelection[modelId]);
      const itemsData = await model.getItemsData(expressIds, { attributesDefault: true });

      for (const attrs of itemsData) {
        if (!attrs) continue;

        const query = {
          categories: [] as string[],
          attributes: [] as { name: string; value: string }[]
        };

        if (attrs._category && (attrs._category as any).value) {
          const categoryValue = (attrs._category as any).value as string;
          query.categories.push(`^${escapeRegExp(categoryValue)}$`);
        }

        const reliableKeys = ["Name", "ObjectType", "Tag"];
        for (const key of reliableKeys) {
          if (attrs[key] && (attrs[key] as any).value) {
            const value = (attrs[key] as any).value as string;
            query.attributes.push({ name: `^${key}$`, value: `^${escapeRegExp(value)}$` });
          }
        }

        if (query.categories.length > 0 || query.attributes.length > 0) {
          queries.push(query);
        }
      }
    }

    if (queries.length === 0) {
      console.error("No reliable attributes found for the selected elements.");
      return;
    }

    const selectionString = JSON.stringify(queries);
    setSelectionForTopic(new Set([selectionString]));
    setCreateModalOpen(true);
    setBcfMode(false);
    highlighter.multiple = "none";
    await highlighter.clear();
  };

  const handleCancelBcfCreation = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.multiple = "none";
    await highlighter.clear();
    setBcfMode(false);
  };

  const handleTopicClick = async (topic: OBC.Topic) => {
    setSelectedTopic(topic);

    if (!components || !topic.viewpoints.size) return;

    const viewpoints = components.get(OBC.Viewpoints);
    const highlighter = components.get(OBCF.Highlighter);
    const finder = components.get(OBC.ItemsFinder);
    const hider = components.get(OBC.Hider);

    if (!viewpoints || !highlighter || !finder || !hider) return;

    const firstViewpointGuid = topic.viewpoints.values().next().value;

    if (firstViewpointGuid) {
      const viewpoint = viewpoints.list.get(firstViewpointGuid);
      if (viewpoint) {
        await viewpoint.go();
        await highlighter.clear();

        if (viewpoint.selectionComponents.size > 0) {
          const selectionString = viewpoint.selectionComponents.values().next().value;
          if (selectionString) {
            let preQuery = JSON.parse(selectionString);
            console.log("preQuery:", preQuery);
            if (!Array.isArray(preQuery)) {
              preQuery = [preQuery];
            }
            const queryName = `query-${topic.guid}`;

            const finalResult: OBC.ModelIdMap = {};

            for (const pq of preQuery) {
              const queryName = `query-${topic.guid}-${Math.random()}`;
              const query: any = {
                attributes: {
                  queries: [],
                  conjunction: "AND",
                },
              };
              if (pq.categories && pq.categories.length > 0) {
                query.categories = pq.categories.map((cat: string) => new RegExp(cat, "i"));
              }
              if (pq.attributes && pq.attributes.length > 0) {
                query.attributes.queries = pq.attributes.map((attr: { name: string; value: string }) => {
                  return { name: new RegExp(attr.name, "i"), value: new RegExp(attr.value, "i") };
                });
              }

              finder.create(queryName, [query]);
              const result = await finder.list.get(queryName)!.test();
              finder.list.delete(queryName);

              for (const modelId in result) {
                if (!finalResult[modelId]) {
                  finalResult[modelId] = new Set();
                }
                for (const expressId of result[modelId]) {
                  finalResult[modelId].add(expressId);
                }
              }
            }
            console.log("finalResult:", finalResult);

            if (finalResult && Object.keys(finalResult).length > 0) {
              await hider.isolate(finalResult);
              await highlighter.highlightByID("select", finalResult);
            } else {
              console.warn("Query returned no results.");
              await hider.set(true);
            }
          }
        }
      }
    }
  };

  const handleCreateTopic = async (formData: any) => {
    if (!bcfTopics || !selectionForTopic) return;

    const topic = bcfTopics.create({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
      stage: formData.stage,
      labels: new Set([formData.labels]),
      assignedTo: formData.assignedTo,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });

    const viewpoints = components.get(OBC.Viewpoints);
    const vp = viewpoints.create();
    if (vp) {
      vp.world = world;
      await vp.updateCamera();
      vp.selectionComponents.add(...selectionForTopic);
      topic.viewpoints.add(vp.guid);
    }

    setCreateModalOpen(false);
    setSelectionForTopic(null);
  };

  const handleEditTopic = (formData: any) => {
    if (!bcfTopics || !selectedTopic) return;

    const before = { ...selectedTopic };

    selectedTopic.title = formData.title;
    selectedTopic.description = formData.description;
    selectedTopic.type = formData.type;
    selectedTopic.priority = formData.priority;
    selectedTopic.stage = formData.stage;
    selectedTopic.labels = new Set([formData.labels]),
    selectedTopic.assignedTo = formData.assignedTo;
    selectedTopic.dueDate = formData.dueDate ? new Date(formData.dueDate) : undefined;

    const after = { ...selectedTopic };
    const editor = "signed.user@mail.com";

    const changes: HistoryRecord = {
      before,
      after,
      editor,
      timestamp: new Date().toLocaleString(),
    };

    if (!("history" in selectedTopic)) {
      (selectedTopic as ExtendedTopic).history = [];
    }
    (selectedTopic as ExtendedTopic).history!.push(changes);

    setTopicsList([...bcfTopics.list.values()]);
    setEditModalOpen(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || !bcfTopics || !newComment.name || !newComment.comment) return;

    const newBcfComment: OBC.BCFApiComment = {
      guid: crypto.randomUUID(),
      date: new Date().toISOString(),
      author: newComment.name,
      comment: newComment.comment,
      viewpoint_guid: undefined,
    };

    selectedTopic.comments.set(newBcfComment.guid, newBcfComment as any);

    setTopicsList([...bcfTopics.list.values()]);
    setNewComment({ name: "", comment: "" });
  };

  const deleteTopic = (e: React.MouseEvent, guid: string) => {
    e.stopPropagation();
    if (!bcfTopics) return;
    bcfTopics.list.delete(guid);
    setTopicsList([...bcfTopics.list.values()]);
    if (selectedTopic?.guid === guid) {
      setSelectedTopic(null);
    }
  };

  const downloadBCF = async () => {
    if (!bcfTopics || !selectedTopic) return;
    const bcfData = await bcfTopics.export([selectedTopic]);
    const fileName = `${selectedTopic.title.replace(/[\\/:\*\?"<>\|]/g, '_')}.bcf`;
    const file = new File([bcfData], fileName, { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadBCF = () => {
    if (!bcfTopics) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bcf";
    input.addEventListener("change", async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        const { topics } = await bcfTopics.load(new Uint8Array(buffer));
        const sanitizedTopics = topics.map((topic: any) => ({
          ...topic,
          dueDate: topic.dueDate ? new Date(topic.dueDate) : undefined,
          labels: topic.labels || new Set(),
          viewpoints: topic.viewpoints || new Set(),
        }));
        setTopicsList([...sanitizedTopics]);
      } catch (error) {
        console.error("Failed to load BCF file:", error);
        alert(t("failed_to_load_bcf"));
      }
    });
    input.click();
  };


  return (
    <div className="relative flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">{isClient ? t("bcf_topics") : "BCF Topics"}</h2>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-gray-700">
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex gap-2 mb-2">
            {!bcfMode ? (
              <button
                className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-2 py-1 rounded`}
                onClick={handleEnterBcfMode}
              >
                {isClient ? t("create") : "Create"}
              </button>
            ) : (
              <>
                <button
                  className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-2 py-1 rounded`}
                  onClick={handleConfirmBcfCreation}
                >
                  {isClient ? t("confirm") : "Confirm"}
                </button>
                <button
                  className={`${darkMode ? "bg-custom-gomorered-600 hover:bg-custom-gomorered-700" : "bg-custom-gomorered-500 hover:bg-custom-gomorered-600"} text-amber-100 px-2 py-1 rounded`}
                  onClick={handleCancelBcfCreation}
                >
                  {isClient ? t("cancel") : "Cancel"}
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
            {/* Topics List */}
            <div className={`flex-1 overflow-y-auto border rounded ${darkMode ? "border-zinc-600" : "border-zinc-400"} p-1`}>
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold">{isClient ? t("topics") : "Topics"}</h5>
                <div className="flex items-center gap-2">
                  <select
                    value={sortCriteria}
                    onChange={(e) => setSortCriteria(e.target.value)}
                    className={`p-1 rounded text-xs ${darkMode ? "bg-zinc-700" : "bg-zinc-200"}`}
                  >
                    <option value="date">Create Time</option>
                    <option value="modifiedDate">Last Modify Time</option>
                    <option value="title">Title</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "dsc" : "asc")}
                    className="p-1 rounded text-xs"
                  >
                    {sortOrder === "asc" ? "▲" : "▼"}
                  </button>
                </div>
              </div>
              <ul>
                {topicsList
                  .sort((a, b) => {
                    const aVal = sortCriteria === 'title' ? a.title : new Date((a as any)[sortCriteria]).getTime();
                    const bVal = sortCriteria === 'title' ? b.title : new Date((b as any)[sortCriteria]).getTime();
                    if (sortOrder === "asc") {
                      return aVal > bVal ? 1 : -1;
                    }
                    return aVal < bVal ? 1 : -1;
                  })
                  .map((topic) => (
                  <li
                    key={topic.guid}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTopicClick(topic);
                    }}
                    className={`cursor-pointer p-1 flex justify-between items-center ${
                      selectedTopic?.guid === topic.guid ? (darkMode ? "bg-zinc-600" : "bg-zinc-300") : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={topic.title}>{topic.title}</span>
                      <span className="text-xs text-gray-500">{new Date(topic.creationDate).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={(e) => deleteTopic(e, topic.guid)}
                      className="text-custom-gomorered-400 hover:text-custom-gomorered-500 font-bold px-2"
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {selectedTopic && (
            <div className={`absolute left-full h-screen ml-4 w-80 p-4 z-10 rounded-lg shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-zinc-200 border-gray-300 text-black"} h-full`}>
              <div className="flex justify-between items-center">
                <h5 className="font-semibold mb-1">{isClient ? t("details") : "Details"}</h5>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="bg-primary text-white px-2 py-1 rounded text-xs"
                  >
                    {isClient ? t("edit") : "Edit"}
                  </button>
                  <button onClick={() => setSelectedTopic(null)} className="text-2xl font-bold">&times;</button>
                </div>
              </div>
              <div className="text-sm space-y-1 overflow-y-auto h-full">
                <p><strong>{isClient ? t("title") : "Title"}:</strong> {selectedTopic.title}</p>
                <p><strong>{isClient ? t("description") : "Description"}:</strong> {selectedTopic.description}</p>
                <p><strong>{isClient ? t("type") : "Type"}:</strong> {selectedTopic.type}</p>
                <p><strong>{isClient ? t("priority") : "Priority"}:</strong> {selectedTopic.priority}</p>
                <p><strong>{isClient ? t("stage") : "Stage"}:</strong> {selectedTopic.stage}</p>
                <p><strong>{isClient ? t("labels") : "Labels"}:</strong> {Array.from(selectedTopic.labels).join(", ")}</p>
                <p><strong>Create Time:</strong> {new Date(selectedTopic.creationDate).toLocaleString()}</p>
                <p><strong>{isClient ? t("assigned_to") : "Assigned To"}:</strong> {selectedTopic.assignedTo || t("unassigned")}</p>
                <p><strong>{isClient ? t("due_date") : "Due Date"}:</strong> {selectedTopic.dueDate?.toLocaleDateString()}</p>
                <p><strong>{isClient ? t("status") : "Status"}:</strong> {selectedTopic.status || t("no_status")}</p>
                <p><strong>Viewpoints:</strong> {Array.from(selectedTopic.viewpoints).join(", ")}</p>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setHistoryModalOpen(true)}
                    className="bg-zinc-500 text-white px-2 py-1 rounded text-xs"
                  >
                    {isClient ? t("history") : "History"}
                  </button>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-600">
                  <h6 className="font-semibold mb-2">{isClient ? t("comments") : "Comments"}</h6>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                    {selectedTopic.comments && Array.from(selectedTopic.comments.values()).map(comment => (
                      <div key={comment.guid} className={`p-2 rounded ${darkMode ? "bg-zinc-500" : "bg-zinc-300"}`}>
                        <p className="font-bold">{comment.author}</p>
                        <p>{comment.comment}</p>
                        <p className="text-xs text-zinc-400">{new Date(comment.date).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddComment}>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder={isClient ? t("your_name") : "Your name"}
                        value={newComment.name}
                        onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                        className={`w-full border ${darkMode ? "bg-zinc-700 border-zinc-500" : "bg-zinc-50 border-zinc-300"} rounded-xl shadow-sm p-2`}
                        required
                      />
                      <textarea
                        placeholder={isClient ? t("add_a_comment") : "Add a comment..."}
                        value={newComment.comment}
                        onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                        className={`w-full border ${darkMode ? "bg-zinc-700 border-zinc-500" : "bg-zinc-50 border-zinc-300"} rounded-xl shadow-sm p-2`}
                        required
                      />
                      <button type="submit" className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded self-end`}>
                        {isClient ? t("add_comment") : "Add Comment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <CreateTopicModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateTopic}
          bcfTopics={bcfTopics}
          darkMode={darkMode}
          topicsList={topicsList}
        />
      )}

      {isEditModalOpen && selectedTopic && (
        <EditTopicModal
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditTopic}
          bcfTopics={bcfTopics}
          topic={selectedTopic}
          darkMode={darkMode}
        />
      )}

      {isHistoryModalOpen && selectedTopic && (
        <HistoryModal
          onClose={() => setHistoryModalOpen(false)}
          bcfTopics={bcfTopics}
          topic={selectedTopic}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

const CreateTopicModal = ({ onClose, onSubmit, bcfTopics, darkMode, topicsList }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState<CreateTopicFormData>({
    title: "",
    description: "",
    type: "Clash",
    priority: "Normal",
    stage: "Design",
    labels: "",
    assignedTo: "",
    dueDate: "",
  });

  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");
  const [titleExists, setTitleExists] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const existingTitles = new Set(topicsList.map((t: OBC.Topic) => t.title));
    let newIndex = 1;
    while (existingTitles.has(`NewTopic${newIndex}`)) {
      newIndex++;
    }
    setFormData((prev) => ({ ...prev, title: `NewTopic${newIndex}` }));
  }, [topicsList]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "title") {
      const existingTitles = new Set(topicsList.map((t: OBC.Topic) => t.title));
      setTitleExists(existingTitles.has(value));
    }
    if (value === "add-new") {
      setIsAddingNew(name);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddNewOption = () => {
    if (!isAddingNew || !newOption || !bcfTopics) return;

    const configKeyMap: { [key: string]: string } = {
      type: "types",
      priority: "priorities",
      stage: "stages",
      labels: "labels",
      assignedTo: "users",
    };

    const configKey = configKeyMap[isAddingNew];
    if (!configKey) return;

    const newSet = new Set((bcfTopics.config as any)[configKey]);
    newSet.add(newOption);
    (bcfTopics.config as any)[configKey] = newSet;

    const formKey = isAddingNew;

    setFormData((prev) => ({ ...prev, [formKey]: newOption }));
    setIsAddingNew(null);
    setNewOption("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50" onMouseDown={(e) => e.stopPropagation()}>
      <div className={`${darkMode ? "bg-gray-800 text-white" : "bg-zinc-50 text-black"} p-4 rounded-xl shadow-lg w-1/3`}>
        <h3 className="text-lg font-bold mb-4">{isClient ? t("new_topic") : "New Topic"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("title") : "Title"}</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
              required
            />
            {titleExists && <p className="text-custom-gomorered-500 text-xs mt-1">{isClient ? t("topic_title_exists") : "A topic with this title already exists."}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("type") : "Type"}</label>
              {isAddingNew === "type" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="type" value={formData.type} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  {bcfTopics && Array.from(bcfTopics.config.types).map((type) => <option key={type as string} value={type as string}>{type as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("priority") : "Priority"}</label>
              {isAddingNew === "priority" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="priority" value={formData.priority} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  {bcfTopics && Array.from(bcfTopics.config.priorities).map((priority) => <option key={priority as string} value={priority as string}>{priority as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("labels") : "Labels"}</label>
              {isAddingNew === "labels" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="labels" value={formData.labels} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("select_a_label") : "Select a label"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.labels).map((label) => <option key={label as string} value={label as string}>{label as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("assigned_to") : "Assigned To"}</label>
              {isAddingNew === "assignedTo" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("unassigned") : "Unassigned"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.users).map((user) => <option key={user as string} value={user as string}>{user as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("due_date") : "Due Date"}</label>
              <div className="relative">
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2 date-picker-input`}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("stage") : "Stage"}</label>
              {isAddingNew === "stage" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="stage" value={formData.stage} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("select_a_stage") : "Select a Stage"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.stages).map((stage) => <option key={stage as string} value={stage as string}>{stage as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("description") : "Description"}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
            />
          </div>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">{isClient ? t("cancel") : "Cancel"}</button>
            <button type="submit" className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded ${titleExists ? "opacity-50 cursor-not-allowed" : ""}`} disabled={titleExists}>{isClient ? t("add_topic") : "Add Topic"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditTopicModal = ({ onClose, onSubmit, bcfTopics, topic, darkMode }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    title: topic.title,
    description: topic.description,
    type: topic.type,
    priority: topic.priority,
    stage: topic.stage,
    labels: Array.from(topic.labels).join(", "),
    assignedTo: topic.assignedTo || "",
    dueDate: topic.dueDate && !isNaN(topic.dueDate.getTime()) ? topic.dueDate.toISOString().split("T")[0] : "",
  });

  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (value === "add-new") {
      setIsAddingNew(name);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddNewOption = () => {
    if (!isAddingNew || !newOption || !bcfTopics) return;

    const configKeyMap: { [key: string]: string } = {
      type: "types",
      priority: "priorities",
      stage: "stages",
      labels: "labels",
      assignedTo: "users",
    };

    const configKey = configKeyMap[isAddingNew];
    if (!configKey) return;

    const newSet = new Set((bcfTopics.config as any)[configKey]);
    newSet.add(newOption);
    (bcfTopics.config as any)[configKey] = newSet;

    const formKey = isAddingNew;

    setFormData((prev) => ({ ...prev, [formKey]: newOption }));
    setIsAddingNew(null);
    setNewOption("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50" onMouseDown={(e) => e.stopPropagation()}>
      <div className={`${darkMode ? "bg-gray-800 text-white" : "bg-zinc-50 text-black"} p-4 rounded-xl shadow-lg w-1/3`}>
        <h3 className="text-lg font-bold mb-4">{isClient ? t("edit_topic") : "Edit Topic"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("title") : "Title"}</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("type") : "Type"}</label>
              {isAddingNew === "type" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="type" value={formData.type} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  {bcfTopics && Array.from(bcfTopics.config.types).map((type) => <option key={type as string} value={type as string}>{type as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("priority") : "Priority"}</label>
              {isAddingNew === "priority" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="priority" value={formData.priority} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  {bcfTopics && Array.from(bcfTopics.config.priorities).map((priority) => <option key={priority as string} value={priority as string}>{priority as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("labels") : "Labels"}</label>
              {isAddingNew === "labels" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="labels" value={formData.labels} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("select_a_label") : "Select a label"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.labels).map((label) => <option key={label as string} value={label as string}>{label as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("assigned_to") : "Assigned To"}</label>
              {isAddingNew === "assignedTo" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("unassigned") : "Unassigned"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.users).map((user) => <option key={user as string} value={user as string}>{user as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("due_date") : "Due Date"}</label>
              <div className="relative">
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2 date-picker-input`}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("stage") : "Stage"}</label>
              {isAddingNew === "stage" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
                  />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : "Add"}</button>
                </div>
              ) : (
                <select name="stage" value={formData.stage} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}>
                  <option value="">{isClient ? t("select_a_stage") : "Select a Stage"}</option>
                  {bcfTopics && Array.from(bcfTopics.config.stages).map((stage) => <option key={stage as string} value={stage as string}>{stage as string}</option>)}
                  <option value="add-new">{isClient ? t("add_new") : "Add New"}</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{isClient ? t("description") : "Description"}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`mt-1 block w-full border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded-xl shadow-sm p-2`}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">{isClient ? t("cancel") : "Cancel"}</button>
            <button type="submit" className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("save_changes") : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  // Set Compare
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (let v of a) if (!b.has(v)) return false;
    return true;
  }

  // Array Compare
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => isEqual(v, b[i]));
  }

  // Object Compare
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (let key of keys) {
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
};

const getDiff = (before: any, after: any) => {
  const diffs: { key: string; before: any; after: any }[] = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  keys.forEach((key) => {
    if (!isEqual(before?.[key], after?.[key])) {
      diffs.push({ key, before: before?.[key], after: after?.[key] });
    }
  });

  return diffs;
};

const HistoryModal = ({ onClose, topic, darkMode }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const extendedTopic = topic as ExtendedTopic;
  const history = extendedTopic.history || [];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatValue = (val: any) => {
    if (val instanceof Set) return Array.from(val).join(", ");
    if (Array.isArray(val)) return val.join(", ");
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div
      className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={`${darkMode ? "bg-gray-800 text-white" : "bg-zinc-50 text-black"} p-4 rounded-xl shadow-lg w-1/2 max-h-[80vh] overflow-y-auto`}
      >
        <h3 className="text-lg font-bold mb-4">{isClient ? t("history_title", { title: topic.title }) : `History - ${topic.title}`}</h3>

        {history.length === 0 ? (
          <p className="text-gray-400">{isClient ? t("no_history") : "No history available for this topic."}</p>
        ) : (
          <ul className="space-y-4">
            {history.map((record, idx) => {
              const diffs = getDiff(record.before, record.after);
              return (
                <li
                  key={idx}
                  className={`p-3 rounded border ${
                    darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {isClient ? t("edited_by") : "Edited by"} <span className="font-bold">{record.editor}</span>
                    </span>
                    <span className="text-xs text-gray-400">{record.timestamp}</span>
                  </div>

                  {diffs.length === 0 ? (
                    <p className="text-xs text-gray-400">{isClient ? t("no_changes_detected") : "No changes detected."}</p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-1 border-b">{isClient ? t("field") : "Field"}</th>
                          <th className="text-left p-1 border-b">{isClient ? t("before") : "Before"}</th>
                          <th className="text-left p-1 border-b">{isClient ? t("after") : "After"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffs.map((d, i) => (
                          <tr key={i}>
                            <td className="p-1 font-semibold">{d.key}</td>
                            <td className="p-1 text-custom-gomorered-400">{formatValue(d.before)}</td>
                            <td className="p-1 text-success-400">{formatValue(d.after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {isClient ? t("close") : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BCFTopics;

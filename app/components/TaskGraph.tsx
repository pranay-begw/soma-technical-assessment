"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Calendar, Clock, AlertTriangle, X } from "lucide-react";

interface TaskGraphProps {
  tasks: Array<{
    id: number;
    title: string;
    dependenciesArray?: number[];
    isOnCriticalPath?: boolean;
    dueDate?: Date | string;
    earliestStartDate?: Date;
    description?: string;
  }>;
}

interface TaskNodeData {
  label: string;
  isCritical: boolean;
  task: TaskGraphProps["tasks"][0];
}

// Custom Node Component (with handles)
const TaskNode: React.FC<
  NodeProps<TaskNodeData> & {
    openNodeId: string | null;
    setOpenNodeId: (id: string | null) => void;
  }
> = ({ data, selected, id, openNodeId, setOpenNodeId }) => {
  const showDetails = openNodeId === id;
  const dueDate = data.task.dueDate ? new Date(data.task.dueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  const handleClick = () => setOpenNodeId(showDetails ? null : id);

  return (
    <>
      {/* Target handle on top, Source handle on bottom */}
      <Handle type="target" position={Position.Top} id="t" />
      <div
        className={`relative px-4 py-3 rounded-xl border transition-all cursor-pointer w-[180px] ${
          data.isCritical ? "bg-red-50 border-red-300" : "bg-white border-gray-300"
        } ${selected ? "ring-2 ring-blue-400 ring-opacity-50" : ""}`}
        onClick={handleClick}
      >
        <div className="flex items-start gap-2">
          {data.isCritical && (
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
              {data.label}
            </h3>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span
                className={`text-xs truncate ${
                  isOverdue ? "text-red-600 font-medium" : "text-gray-600"
                }`}
              >
                {dueDate?.toLocaleDateString() || "No date"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {data.isCritical && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              Critical
            </span>
          )}
          {isOverdue && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              Overdue
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" />

      {/* Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
          onClick={() => setOpenNodeId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 pr-4 flex-1">
                  {data.task.title}
                </h2>
                <button
                  onClick={() => setOpenNodeId(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {data.task.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">
                    {data.task.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-sm">Due Date</span>
                  </div>
                  <p className={isOverdue ? "text-red-600 font-medium" : "text-blue-600"}>
                    {dueDate?.toLocaleDateString() || "No due date set"}
                  </p>
                </div>

                {data.task.earliestStartDate && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium text-sm">Earliest Start</span>
                    </div>
                    <p className="text-green-600">
                      {data.task.earliestStartDate.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {data.isCritical && (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-2 rounded-full text-sm font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Critical Path
                  </span>
                )}
                {isOverdue && (
                  <span className="bg-orange-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const TaskGraph: React.FC<TaskGraphProps> = ({ tasks }) => {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);

  const nodeTypes = useMemo(
    () => ({
      taskNode: (props: NodeProps<TaskNodeData>) => (
        <TaskNode
          {...props}
          openNodeId={openNodeId}
          setOpenNodeId={setOpenNodeId}
        />
      ),
    }),
    [openNodeId]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node<TaskNodeData>[] = [];
    const edges: Edge[] = [];
    const levels: Record<number, number> = {};

    // Longest-path level assignment
    const calculateLevel = (taskId: number, visited = new Set<number>()): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.dependenciesArray?.length) return 0;
      const maxLevel = Math.max(
        ...task.dependenciesArray.map((depId) => calculateLevel(depId, new Set(visited)))
      );
      return maxLevel + 1;
    };

    tasks.forEach((task) => {
      levels[task.id] = calculateLevel(task.id);
    });

    const tasksByLevel: Record<number, typeof tasks> = {};
    tasks.forEach((task) => {
      const level = levels[task.id];
      (tasksByLevel[level] ??= []).push(task);
    });

    // Layout constants
    const nodeWidth = 200;
    const nodeHeight = 120;
    const vGap = 140;
    const hGap = 240;

    // Build nodes
    Object.entries(tasksByLevel).forEach(([levelStr, levelTasks]) => {
      const level = parseInt(levelStr, 10);
      const y = level * (nodeHeight + vGap);
      const totalWidth = (levelTasks.length - 1) * (nodeWidth + hGap);
      const startX = -totalWidth / 2;

      levelTasks.forEach((task, index) => {
        const x = startX + index * (nodeWidth + hGap);
        nodes.push({
          id: task.id.toString(),
          type: "taskNode",
          data: { label: task.title, isCritical: !!task.isOnCriticalPath, task },
          position: { x, y },
          draggable: true,
        });
      });
    });

    // Build edges (solid, simple)
    tasks.forEach((task) => {
      task.dependenciesArray?.forEach((depId) => {
        const sourceTask = tasks.find((t) => t.id === depId);
        const isCriticalEdge = !!(
          task.isOnCriticalPath && sourceTask?.isOnCriticalPath
        );

        edges.push({
          id: `${depId}-${task.id}`,
          source: depId.toString(),
          target: task.id.toString(),
          type: "bezier",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCriticalEdge ? "#ef4444" : "#475569",
            width: 18,
            height: 18,
          },
          style: {
            stroke: isCriticalEdge ? "#ef4444" : "#475569",
            strokeWidth: isCriticalEdge ? 3.5 : 2.5,
          },
        });
      });
    });

    return { nodes, edges };
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    if (openNodeId && !tasks.find((t) => t.id.toString() === openNodeId))
      setOpenNodeId(null);
  }, [initialNodes, initialEdges, setNodes, setEdges, openNodeId, tasks]);

  const criticalPathTasks = tasks.filter((t) => t.isOnCriticalPath);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Graph area */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={(instance) =>
            instance.fitView({ padding: 0.2, includeHiddenNodes: true })
          }
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1.5 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
          className="bg-gradient-to-br from-gray-50 to-slate-100"
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          }}
        >
          <Background
            variant="dots"
            gap={30}
            size={2}
            color="#cbd5e1"
            style={{ opacity: 0.4 }}
          />
          <Controls
            className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      {/* Footer summary stays visible */}
      {criticalPathTasks.length > 0 && (
        <div className="p-4 bg-red-50 border-t border-red-200/30 shrink-0">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Critical Path ({criticalPathTasks.length} tasks)
          </h3>
          <div className="flex flex-wrap gap-2">
            {criticalPathTasks
              .sort((a, b) => a.id - b.id)
              .map((task, index, array) => (
                <React.Fragment key={task.id}>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200">
                    {task.title}
                  </span>
                  {index < array.length - 1 && (
                    <span className="text-red-400 mx-1 self-center">→</span>
                  )}
                </React.Fragment>
              ))}
          </div>
          <p className="text-red-600 text-xs mt-2 opacity-80">
            These tasks determine your project timeline. Delays here will delay
            the entire project.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskGraph;

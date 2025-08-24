'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface TaskGraphProps {
  tasks: Array<{
    id: number;
    title: string;
    dependenciesArray?: number[];
    isOnCriticalPath?: boolean;
  }>;
}

const TaskGraph: React.FC<TaskGraphProps> = ({ tasks }) => {
  const nodeWidth = 200;
  const nodeHeight = 80;
  const verticalSpacing = 100;
  const horizontalSpacing = 250;

  // Calculate node positions in a hierarchical layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const levels: Record<number, number> = {};
    
    // Calculate levels for each node (longest path from a leaf)
    const calculateLevel = (taskId: number, visited = new Set<number>()): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task?.dependenciesArray?.length) return 0;
      
      const maxLevel = Math.max(
        ...task.dependenciesArray.map(depId => calculateLevel(depId, new Set(visited)))
      );
      
      return maxLevel + 1;
    };

    // Assign levels to tasks
    tasks.forEach(task => {
      levels[task.id] = calculateLevel(task.id);
    });

    // Group tasks by level
    const tasksByLevel: Record<number, typeof tasks> = {};
    tasks.forEach(task => {
      const level = levels[task.id];
      if (!tasksByLevel[level]) tasksByLevel[level] = [];
      tasksByLevel[level].push(task);
    });

    // Calculate positions
    Object.entries(tasksByLevel).forEach(([level, levelTasks]) => {
      const y = parseInt(level) * (nodeHeight + verticalSpacing);
      const totalWidth = (levelTasks.length - 1) * (nodeWidth + horizontalSpacing);
      const startX = -totalWidth / 2;

      levelTasks.forEach((task, index) => {
        const x = startX + index * (nodeWidth + horizontalSpacing);
        
        nodes.push({
          id: task.id.toString(),
          data: { 
            label: task.title,
            isCritical: task.isOnCriticalPath 
          },
          position: { x, y },
          style: {
            width: nodeWidth,
            height: nodeHeight,
            border: task.isOnCriticalPath ? '2px solid #ff0072' : '1px solid #222',
            borderRadius: '8px',
            padding: '10px',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        });

        // Add edges for dependencies
        task.dependenciesArray?.forEach(depId => {
          edges.push({
            id: `${depId}-${task.id}`,
            source: depId.toString(),
            target: task.id.toString(),
            type: 'bezier',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: tasks.find(t => t.id === depId)?.isOnCriticalPath ? '#ff0072' : '#222',
            },
            style: {
              stroke: tasks.find(t => t.id === depId)?.isOnCriticalPath ? '#ff0072' : '#222',
              strokeWidth: 2,
            },
          });
        });
      });
    });

    return { nodes, edges };
  }, [tasks]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div>
      <div style={{ width: '100%', height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Critical Path:</h3>
        <div className="flex flex-wrap gap-2">
          {tasks
            .filter(task => task.isOnCriticalPath)
            .sort((a, b) => a.id - b.id)
            .map((task, index, array) => (
              <React.Fragment key={task.id}>
                <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                  {task.title}
                </span>
                {index < array.length - 1 && (
                  <span className="text-gray-400 mx-1">→</span>
                )}
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TaskGraph;

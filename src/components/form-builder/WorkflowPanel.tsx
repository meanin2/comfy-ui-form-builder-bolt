import React from 'react';
import { Upload, Save, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

interface WorkflowPanelProps {
  importAction?: boolean;
}

interface NodeInputs {
  [key: string]: any;
}

interface WorkflowNode {
  inputs: NodeInputs;
  class_type: string;
  _meta?: {
    title: string;
  };
}

interface Workflow {
  [key: string]: WorkflowNode;
}

export default function WorkflowPanel({ importAction }: WorkflowPanelProps) {
  const { workflow, setWorkflow } = useApp();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const isValidWorkflow = (json: any): json is Workflow => {
    if (typeof json !== 'object' || json === null) return false;

    // Check if it's a workflow object with numbered keys and proper node structure
    return Object.entries(json).every(([key, node]) => {
      const isKeyNumeric = /^\d+$/.test(key);
      const hasValidStructure = node && 
        typeof node === 'object' && 
        'inputs' in node && 
        'class_type' in node;
      
      return isKeyNumeric && hasValidStructure;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (!isValidWorkflow(json)) {
          toast.error('Invalid workflow format. Please export the workflow from ComfyUI in API format.');
          return;
        }

        setWorkflow(json);
        toast.success('Workflow imported successfully');
      } catch (error) {
        toast.error('Invalid workflow file');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!workflow) {
      toast.error('No workflow to export');
      return;
    }

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const shouldShowInput = (value: any): boolean => {
    if (Array.isArray(value) && value.length === 2 && 
        typeof value[0] === 'string' && typeof value[0].match(/^\d+$/) &&
        typeof value[1] === 'number') {
      return false;
    }
    return true;
  };

  const renderNodeInputs = (inputs: NodeInputs | undefined) => {
    if (!inputs) return null;

    return Object.entries(inputs)
      .filter(([_, value]) => shouldShowInput(value))
      .map(([key, value]) => (
        <div key={key} className="pl-4 py-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">{key}:</span>{' '}
          <span className="text-gray-900 dark:text-white">
            {Array.isArray(value) 
              ? `[${value.join(', ')}]`
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)
            }
          </span>
        </div>
      ));
  };

  React.useEffect(() => {
    if (importAction) {
      fileInputRef.current?.click();
    }
  }, [importAction]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow</h2>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {workflow ? (
          <div className="space-y-2">
            {Object.entries(workflow as Workflow).map(([id, node]) => (
              <div
                key={id}
                className="rounded-md overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <button
                  onClick={() => toggleNode(id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {node._meta?.title || node.class_type}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {id}
                    </div>
                  </div>
                  {expandedNodes.has(id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedNodes.has(id) && (
                  <div className="bg-white dark:bg-gray-800 p-3 text-sm">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      Inputs:
                    </div>
                    {renderNodeInputs(node?.inputs)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No workflow imported
          </div>
        )}
      </div>
    </div>
  );
}
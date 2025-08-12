import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { SchemaField, ColumnMapping, SurveySchema } from '../types/survey';
import { SchemaMapper as SchemaMapperUtil } from '../utils/schemaMapper';
import { Upload, Download, Link, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface SchemaMapperProps {
  dataColumns: string[];
  schema?: SurveySchema;
  onMappingComplete: (mappings: ColumnMapping[]) => void;
  onSchemaUpload: (schema: SurveySchema) => void;
}

export const SchemaMapper: React.FC<SchemaMapperProps> = ({
  dataColumns,
  schema,
  onMappingComplete,
  onSchemaUpload
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [showSchemaUpload, setShowSchemaUpload] = useState(!schema);

  useEffect(() => {
    if (schema) {
      const suggestedMappings = SchemaMapperUtil.suggestMappings(dataColumns, schema.fields);
      setMappings(suggestedMappings);
      
      const mappedColumns = suggestedMappings.map(m => m.sourceColumn);
      setUnmappedColumns(dataColumns.filter(col => !mappedColumns.includes(col)));
    } else {
      setUnmappedColumns(dataColumns);
    }
  }, [dataColumns, schema]);

  const handleSchemaFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const schemaData = JSON.parse(e.target?.result as string);
          onSchemaUpload(schemaData);
          setShowSchemaUpload(false);
        } catch (error) {
          alert('Invalid schema file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !schema) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'unmapped' && destination.droppableId.startsWith('field-')) {
      const fieldId = destination.droppableId.replace('field-', '');
      const columnName = unmappedColumns[source.index];
      
      const newMapping: ColumnMapping = {
        sourceColumn: columnName,
        targetField: fieldId,
        confidence: 1.0
      };

      setMappings([...mappings.filter(m => m.targetField !== fieldId), newMapping]);
      setUnmappedColumns(unmappedColumns.filter(col => col !== columnName));
    }
  };

  const removeMapping = (mapping: ColumnMapping) => {
    setMappings(mappings.filter(m => m !== mapping));
    setUnmappedColumns([...unmappedColumns, mapping.sourceColumn]);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const downloadSampleSchema = () => {
    const sampleSchema: SurveySchema = {
      id: 'sample-survey',
      name: 'Sample Survey Schema',
      fields: [
        { id: 'respondent_id', name: 'Respondent ID', type: 'text', required: true },
        { id: 'age', name: 'Age', type: 'number', required: true, range: { min: 0, max: 120 } },
        { id: 'gender', name: 'Gender', type: 'categorical', required: false, validValues: ['Male', 'Female', 'Other'] },
        { id: 'email', name: 'Email Address', type: 'text', required: false },
        { id: 'satisfaction', name: 'Satisfaction Score', type: 'scale', required: true, range: { min: 1, max: 10 } }
      ],
      validationRules: [],
      skipPatterns: []
    };

    const blob = new Blob([JSON.stringify(sampleSchema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-schema.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (showSchemaUpload) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Survey Schema</h3>
          <p className="text-gray-600 mb-6">
            Upload a JSON schema file to map your data columns to survey fields
          </p>

          <div className="space-y-4">
            <input
              type="file"
              accept=".json"
              onChange={handleSchemaFileUpload}
              className="hidden"
              id="schema-upload"
            />
            <label
              htmlFor="schema-upload"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 cursor-pointer"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Schema File
            </label>

            <div className="text-sm text-gray-500">
              <p>Don't have a schema file?</p>
              <button
                onClick={downloadSampleSchema}
                className="text-blue-600 hover:text-blue-700 underline inline-flex items-center mt-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Sample Schema
              </button>
            </div>

            <button
              onClick={() => setShowSchemaUpload(false)}
              className="text-gray-600 hover:text-gray-700 underline"
            >
              Skip schema mapping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 w-12 h-12 rounded-full flex items-center justify-center">
            <Link className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Schema Mapping</h3>
            <p className="text-gray-600">Map your data columns to survey schema fields</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onMappingComplete(mappings)}
            disabled={mappings.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Mapping
          </button>
          <button
            onClick={() => setShowSchemaUpload(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Change Schema
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unmapped Columns */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Data Columns</h4>
            <Droppable droppableId="unmapped">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-50 rounded-lg p-4 min-h-32"
                >
                  {unmappedColumns.map((column, index) => (
                    <Draggable key={column} draggableId={column} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-3 rounded-lg shadow-sm mb-2 cursor-move hover:shadow-md transition-shadow"
                        >
                          <div className="font-medium text-gray-900">{column}</div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {unmappedColumns.length === 0 && (
                    <div className="text-gray-500 text-center py-4">
                      All columns mapped
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Schema Fields */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Schema Fields</h4>
            <div className="space-y-3">
              {schema?.fields.map((field) => {
                const mapping = mappings.find(m => m.targetField === field.id);
                return (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{field.name}</div>
                        <div className="text-sm text-gray-500">
                          {field.type} {field.required && '(required)'}
                        </div>
                      </div>
                      {field.required && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                    </div>

                    <Droppable droppableId={`field-${field.id}`}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border-2 border-dashed rounded-lg p-3 min-h-16 ${
                            mapping 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          {mapping ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-gray-900">
                                  {mapping.sourceColumn}
                                </span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{field.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(mapping.confidence)}`}>
                                  {Math.round(mapping.confidence * 100)}%
                                </span>
                                <button
                                  onClick={() => removeMapping(mapping)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-gray-500">
                              <AlertCircle className="w-5 h-5 mr-2" />
                              Drop column here
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Mapping Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-semibold text-blue-900 mb-2">Mapping Summary</h5>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Columns:</span>
            <span className="font-medium text-blue-900 ml-2">{dataColumns.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Mapped:</span>
            <span className="font-medium text-blue-900 ml-2">{mappings.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Unmapped:</span>
            <span className="font-medium text-blue-900 ml-2">{unmappedColumns.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
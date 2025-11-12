# ABM JSON Schema - LLM Input Format

This document shows what the `generateAbmJSONResponseSchema()` method converts to when sent to different LLMs.

## How It's Used

### Schema + Text Prompts Together

The JSON schema is **paired with text prompts** when sent to the LLM. The complete input includes:

1. **System Prompt** (text): Instructions on how to generate the model
   ```javascript
   "You are a professional Agent based Modeler. Users will give you text, and it is your job to generate an agent based model from that text.
   
   You will conduct a multistep process:
   ..... write this..."
   ```

2. **User Prompt** (text): The actual request from the user
   ```javascript
   "write me an SIR abm network model using python and mesa."
   ```

3. **Optional Previous Model** (JSON): If iterating on an existing model
   ```javascript
   { role: "assistant", content: JSON.stringify(lastModel, null, 2) }
   ```

4. **Optional Assistant Prompt** (text): Instructions for considering the previous model
   ```javascript
   "I want your response to consider the model which you have already so helpfully given to us."
   ```

5. **Response Schema** (JSON Schema): Defines the **output format** the LLM must follow

The schema doesn't contain instructions - it only defines the structure. The actual instructions come from the text prompts!

### Schema Conversion by LLM Provider

The schema is converted differently depending on the LLM provider:

1. **OpenAI**: Uses `zodResponseFormat()` from OpenAI SDK (converts Zod → OpenAI JSON Schema format)
2. **Gemini**: Uses `ZodToStructuredOutputConverter.convert()` → JSON Schema format
3. **Claude**: Uses `ZodToStructuredOutputConverter.convert()` → Wrapped in a tool definition

## Converted JSON Schema Structure

Based on the `ZodToStructuredOutputConverter` logic, here's what the schema looks like when converted to JSON Schema format (used by Gemini and Claude):

```json
{
  "type": "object",
  "properties": {
    "model": {
      "type": "object",
      "properties": {
        "codingLanguage": {
          "type": "string",
          "description": "The programming language used for writing all functions in this schema. This tells the model what syntax to generate (e.g., 'python', 'julia', 'r', 'java', 'netlogo')."
        },
        "abmLibrary": {
          "type": "object",
          "nullable": true,
          "properties": {
            "name": {
              "type": "string",
              "description": "The ABM library/framework to use for implementation. Library-specific code patterns (e.g., self.model in Mesa, agent.model in AgentPy) are allowed in code fields when a library is specified. popular libraries by language: python: mesa, agentpy, pyCX, simpy | julia: Agents.jl | r: NetLogoR | java: MASON, Repast | netlogo: NetLogo. Must be compatible with the specified codingLanguage."
            },
            "version": {
              "type": "string",
              "nullable": true,
              "description": "Version of the ABM library (optional). Format examples: '3.x' (major version), '3.2' (minor version), '3.2.1' (patch version). Default: 'latest' - interpreted as the most recent version known to the LLM at generation time. Used by code generators/compilers to produce version-appropriate code patterns. For example, Mesa 2.x uses Agent(unique_id, model) while Mesa 3.x uses Agent(model). Specifying the version helps ensure generated code matches the target library version."
            }
          },
          "required": ["name"]
        },
        "globalFunctions": {
          "type": "array",
          "nullable": true,
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "The name of the global function."
              },
              "sourceName": {
                "type": "string",
                "description": "The fully qualified source reference for this function (e.g., if the name is calculateDistance, then the sourceName should be 'globalFunction.calculateDistance')."
              },
              "functionDescription": {
                "type": "string",
                "description": "A plain-language explanation of what the function does, without code. E.g., 'Computes distance between two points.'"
              },
              "functionInputs": {
                "type": "array",
                "nullable": true,
                "items": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "type": {
                      "type": "string",
                      "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
                    },
                    "optional": { "type": "boolean" },
                    "defaultValue": {
                      "anyOf": [
                        { "type": "string" },
                        { "type": "number" },
                        { "type": "boolean" }
                      ],
                      "nullable": true
                    }
                  },
                  "required": ["name", "description", "type", "optional"]
                }
              },
              "functionOutputs": {
                "type": "array",
                "nullable": true,
                "items": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "type": {
                      "type": "string",
                      "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
                    }
                  },
                  "required": ["name", "description", "type"]
                }
              },
              "executionMode": {
                "type": "string",
                "enum": ["per-agent", "model-once", "model-batch"]
              },
              "code": {
                "type": "string",
                "description": "The complete function implementation in the codingLanguage. Should be a full function definition including signature, docstring, and body. For Python: 'def function_name(params):\\n    \"\"\"Docstring.\"\"\"\\n    # implementation'. Use only variables and functions defined in this schema."
              }
            },
            "required": ["name", "sourceName", "functionDescription", "executionMode", "code"]
          },
          "description": "Section containing reusable helper functions that are not tied to agents or the environment. Use these to initialize or compute values across the simulation."
        },
        "globalVariables": {
          "type": "array",
          "nullable": true,
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" },
              "type": {
                "type": "string",
                "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
              },
              "initialValue": {
                "anyOf": [
                  {
                    "anyOf": [
                      { "type": "string" },
                      { "type": "number" },
                      { "type": "boolean" }
                    ]
                  },
                  {
                    "type": "object",
                    "properties": {
                      "function": { "type": "string" },
                      "args": {
                        "type": "array",
                        "items": {
                          "anyOf": [
                            { "type": "string" },
                            { "type": "number" },
                            { "type": "boolean" }
                          ]
                        }
                      }
                    },
                    "required": ["function", "args"]
                  }
                ]
              },
              "sourceName": { "type": "string" }
            },
            "required": ["name", "description", "type", "initialValue", "sourceName"]
          },
          "description": "Variables accessible from anywhere in the model. Each must include a description, type, sourceName, and initialValue or function to generate the initial value."
        },
        "environment": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "The name of the simulation environment. Describe the world or context (e.g., 'forest', 'grid world')."
            },
            "description": {
              "type": "string",
              "description": "A plain-language explanation of what the environment represents in the model."
            },
            "topology": {
              "type": "object",
              "properties": {
                "description": {
                  "type": "string",
                  "description": "A human-readable summary of the chosen topology. E.g., 'A toroidal grid representing a wrap-around world.'"
                },
                "type": {
                  "type": "string",
                  "enum": ["none", "grid", "network"],
                  "description": "The type of the topology (none, grid, or network)."
                },
                "boundaryConditions": {
                  "type": "string",
                  "enum": ["fixed", "torus"],
                  "nullable": true,
                  "description": "Only needed for grid topology. Specifies what happens at the edges of the environment (fixed boundaries or torus wrapping)."
                }
              },
              "required": ["description", "type"]
            },
            "environmentAttributes": {
              "type": "array",
              "nullable": true,
              "items": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "The name of the environment attribute."
                  },
                  "description": {
                    "type": "string",
                    "description": "Explains what the world attribute represents and why it matters in the simulation. An environment attribute is a property of the environment."
                  },
                  "type": {
                    "type": "string",
                    "enum": ["integer", "float", "number", "string", "boolean", "array", "object"],
                    "description": "The data type of the world attribute (integer, float, number, string, boolean, array, or object)."
                  },
                  "initialValue": {
                    "anyOf": [
                      {
                        "anyOf": [
                          { "type": "string" },
                          { "type": "number" },
                          { "type": "boolean" }
                        ]
                      },
                      {
                        "type": "object",
                        "properties": {
                          "function": {
                            "type": "string",
                            "description": "The name of the function to call. Must reference a function defined in globalFunctions, environmentBehaviors, or agentBehaviors."
                          },
                          "args": {
                            "type": "array",
                            "items": {
                              "anyOf": [
                                { "type": "string" },
                                { "type": "number" },
                                { "type": "boolean" }
                              ]
                            },
                            "description": "Arguments to pass to the function. Values can be literals or references to globalVariables, environmentAttributes, agentAttributes, or other defined values in the schema."
                          }
                        },
                        "required": ["function", "args"]
                      }
                    ],
                    "description": "Initial value: can be a literal (5, 'hello', []), a framework attribute reference ('self.unique_id'), or a function call. Framework references are evaluated at runtime."
                  },
                  "sourceName": {
                    "type": "string",
                    "description": "The fully qualified source reference for this attribute (e.g., if its name is temperature, then its sourceName should be 'environment.environmentAttribute.temperature')."
                  }
                },
                "required": ["name", "description", "type", "initialValue", "sourceName"]
              },
              "description": "A dictionary of world-level properties. Each attribute includes description, type, and an initial value or generator. An environment attribute is a property of the environment."
            },
            "environmentBehaviors": {
              "type": "array",
              "nullable": true,
              "items": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "The name of the environment behavior."
                  },
                  "description": {
                    "type": "string",
                    "description": "A human-readable explanation of what this environment behavior does, without code. An environment behavior is a function that affects the environment or things related to the environment."
                  },
                  "inputs": {
                    "type": "array",
                    "nullable": true,
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "description": "The name of the input parameter as used in the function signature."
                        },
                        "description": {
                          "type": "string",
                          "description": "Description of what this input parameter exists for this function."
                        },
                        "type": {
                          "type": "string",
                          "enum": ["integer", "float", "number", "string", "boolean", "array", "object"],
                          "description": "The data type of the input parameter (integer, float, number, string, boolean, array, or object)"
                        },
                        "optional": {
                          "type": "boolean",
                          "description": "Whether this parameter is optional. Optional parameters can be omitted when calling the function. Defaults to False (required)."
                        },
                        "defaultValue": {
                          "anyOf": [
                            { "type": "string" },
                            { "type": "number" },
                            { "type": "boolean" }
                          ],
                          "nullable": true,
                          "description": "Default value used when this optional parameter is not provided. Should only be set when optional=True."
                        }
                      },
                      "required": ["name", "description", "type", "optional"]
                    },
                    "description": "An array describing the inputs required by this environment behavior. Each entry must include a name, description, a type, and a sourceName."
                  },
                  "outputs": {
                    "type": "array",
                    "nullable": true,
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "description": "The name of the output parameter as returned by the function."
                        },
                        "description": {
                          "type": "string",
                          "description": "Description of what this output parameter exists for this function."
                        },
                        "type": {
                          "type": "string",
                          "enum": ["integer", "float", "number", "string", "boolean", "array", "object"],
                          "description": "The data type of the output parameter (integer, float, number, string, boolean, array, or object)"
                        }
                      },
                      "required": ["name", "description", "type"]
                    },
                    "description": "An array describing the outputs produced by this behavior, with name, description, type, and a sourceName."
                  },
                  "executionMode": {
                    "type": "string",
                    "enum": ["per-agent", "model-once", "model-batch"],
                    "description": "Execution mode determines how this behavior is invoked: 'per-agent' (run once for each agent instance), 'model-once' (run once in the model context), or 'model-batch' (run once with access to batch collections such as all agents)."
                  },
                  "code": {
                    "type": "string",
                    "description": "The complete function/method implementation in the codingLanguage. Should be a full function definition including signature, docstring, and body. For Python: 'def behavior_name(self):\\n    \"\"\"Docstring.\"\"\"\\n    # implementation'. Must reference only sourceName of variables and functions."
                  },
                  "sourceName": {
                    "type": "string",
                    "description": "The fully qualified source reference for this behavior (e.g., if its name is updateTemperature, then the sourceName should be 'environment.environmentBehavior.updateTemperature')."
                  }
                },
                "required": ["name", "description", "executionMode", "code", "sourceName"]
              },
              "description": "A dictionary of functions that affect the environment itself. Each behavior acts at the environment level."
            }
          },
          "required": ["name", "description", "topology"]
        },
        "agents": {
          "type": "array",
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "agentAttributes": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "description": { "type": "string" },
                      "type": {
                        "type": "string",
                        "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
                      },
                      "initialValue": {
                        "anyOf": [
                          {
                            "anyOf": [
                              { "type": "string" },
                              { "type": "number" },
                              { "type": "boolean" }
                            ]
                          },
                          {
                            "type": "object",
                            "properties": {
                              "function": { "type": "string" },
                              "args": {
                                "type": "array",
                                "items": {
                                  "anyOf": [
                                    { "type": "string" },
                                    { "type": "number" },
                                    { "type": "boolean" }
                                  ]
                                }
                              }
                            },
                            "required": ["function", "args"]
                          }
                        ]
                      },
                      "sourceName": { "type": "string" }
                    },
                    "required": ["name", "description", "type", "initialValue", "sourceName"]
                  }
                },
                "initialCount": {
                  "anyOf": [
                    {
                      "anyOf": [
                        { "type": "string" },
                        { "type": "number" },
                        { "type": "boolean" }
                      ]
                    },
                    {
                      "type": "object",
                      "properties": {
                        "function": { "type": "string" },
                        "args": {
                          "type": "array",
                          "items": {
                            "anyOf": [
                              { "type": "string" },
                              { "type": "number" },
                              { "type": "boolean" }
                            ]
                          }
                        }
                      },
                      "required": ["function", "args"]
                    }
                  ]
                },
                "agentBehaviors": {
                  "type": "array",
                  "nullable": true,
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "description": { "type": "string" },
                      "inputs": {
                        "type": "array",
                        "nullable": true,
                        "items": {
                          "type": "object",
                          "properties": {
                            "name": { "type": "string" },
                            "description": { "type": "string" },
                            "type": {
                              "type": "string",
                              "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
                            },
                            "optional": { "type": "boolean" },
                            "defaultValue": {
                              "anyOf": [
                                { "type": "string" },
                                { "type": "number" },
                                { "type": "boolean" }
                              ],
                              "nullable": true
                            }
                          },
                          "required": ["name", "description", "type", "optional"]
                        }
                      },
                      "outputs": {
                        "type": "array",
                        "nullable": true,
                        "items": {
                          "type": "object",
                          "properties": {
                            "name": { "type": "string" },
                            "description": { "type": "string" },
                            "type": {
                              "type": "string",
                              "enum": ["integer", "float", "number", "string", "boolean", "array", "object"]
                            }
                          },
                          "required": ["name", "description", "type"]
                        }
                      },
                      "executionMode": {
                        "type": "string",
                        "enum": ["per-agent", "model-once", "model-batch"]
                      },
                      "sourceName": { "type": "string" },
                      "code": { "type": "string" }
                    },
                    "required": ["name", "description", "executionMode", "sourceName", "code"]
                  }
                }
              },
              "required": ["agentAttributes", "initialCount"]
            }
          },
          "description": "An array describing each type of agent in the simulation. Each agent type defines its own attributes, behaviors, and initial count."
        },
        "terminationCriteria": {
          "type": "object",
          "properties": {
            "terminationRules": {
              "type": "array",
              "nullable": true,
              "items": {
                "type": "object",
                "properties": {
                  "sourceName": {
                    "type": "string",
                    "description": "The sourceName of the variable/attribute being monitored (e.g., 'globalVariable.population', 'environment.environmentAttribute.temperature', 'agent.Person.agentAttribute.health')"
                  },
                  "description": { "type": "string" },
                  "type": { "type": "string" },
                  "value": {
                    "anyOf": [
                      {
                        "anyOf": [
                          { "type": "string" },
                          { "type": "number" },
                          { "type": "boolean" }
                        ]
                      },
                      {
                        "type": "object",
                        "properties": {
                          "function": { "type": "string" },
                          "args": {
                            "type": "array",
                            "items": {
                              "anyOf": [
                                { "type": "string" },
                                { "type": "number" },
                                { "type": "boolean" }
                              ]
                            }
                          }
                        },
                        "required": ["function", "args"]
                      }
                    ]
                  }
                },
                "required": ["sourceName", "description", "type", "value"]
              }
            },
            "maxSteps": {
              "type": "number",
              "description": "A fallback limit on the number of simulation steps. If no termination rule is met, the simulation stops when maxSteps is reached."
            }
          },
          "required": ["maxSteps"]
        },
        "scheduler": {
          "type": "object",
          "properties": {
            "initialization": {
              "type": "object",
              "properties": {
                "description": { "type": "string" },
                "initializationOrder": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "sourceName": { "type": "string" },
                      "type": {
                        "type": "string",
                        "enum": ["agentAttribute", "environmentAttribute", "globalVariable", "globalFunction", "initialCount"]
                      },
                      "orderInInitialization": { "type": "number" }
                    },
                    "required": ["sourceName", "type", "orderInInitialization"]
                  }
                }
              },
              "required": ["description", "initializationOrder"]
            },
            "schedule": {
              "type": "object",
              "properties": {
                "description": { "type": "string" },
                "scheduleOrder": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "sourceName": { "type": "string" },
                      "type": {
                        "type": "string",
                        "enum": ["agentBehavior", "environmentBehavior", "globalFunction"]
                      },
                      "orderInSchedule": { "type": "number" }
                    },
                    "required": ["sourceName", "type", "orderInSchedule"]
                  }
                }
              },
              "required": ["description", "scheduleOrder"]
            }
          },
          "required": ["initialization", "schedule"]
        },
        "dataAnalytics": {
          "type": "object",
          "nullable": true,
          "properties": {
            "trackedVariables": {
              "type": "array",
              "nullable": true,
              "items": {
                "type": "object",
                "properties": {
                  "description": { "type": "string" },
                  "sourceName": { "type": "string" },
                  "collectionLevel": {
                    "type": "string",
                    "enum": ["model", "agent"]
                  },
                  "checkTime": {
                    "type": "string",
                    "enum": ["start-of-step", "end-of-step"]
                  }
                },
                "required": ["description", "sourceName", "collectionLevel", "checkTime"]
              }
            }
          }
        }
      },
      "required": ["codingLanguage", "environment", "agents", "terminationCriteria", "scheduler"]
    },
    "explanation": {
      "type": "string",
      "description": "This is markdown formatted text. Concisely explain your reasoning for each change you made to the old model to create the new model. Speak in plain English, don't reference json specifically. Don't reiterate the request or any of these instructions."
    },
    "title": {
      "type": "string",
      "description": "A highly descriptive 7 word max title describing your explanation."
    }
  },
  "required": ["model", "explanation", "title"],
  "propertyOrdering": ["model", "explanation", "title"]
}
```

## LLM-Specific Formats

### OpenAI Format
OpenAI uses `zodResponseFormat()` which converts the Zod schema to OpenAI's JSON Schema format. The structure is similar but wrapped in:
```javascript
{
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "sdai_schema",
      strict: true,
      schema: { /* JSON Schema here */ }
    }
  }
}
```

### Gemini Format
Gemini receives the schema as:
```javascript
{
  config: {
    responseMimeType: "application/json",
    responseSchema: { /* JSON Schema here */ }
  }
}
```

### Claude Format
Claude receives the schema wrapped in a tool definition:
```javascript
{
  tools: [{
    name: "structured_output",
    description: "Output structured data according to the schema",
    input_schema: { /* JSON Schema here */ }
  }],
  tool_choice: {
    type: "tool",
    name: "structured_output"
  }
}
```

## Property Ordering

The order of properties in the schema is determined by **the order they're defined in the Zod schema** (`z.object({...})`). 

Currently in `ABMJsonSchema` (lines 625-654 of `LLMWrapper.js`), the order is:
1. `codingLanguage`
2. `abmLibrary` (optional)
3. `globalFunctions` (optional) ⬅️ **Now before environment**
4. `globalVariables` (optional) ⬅️ **Now before environment**
5. `environment`
6. `agents`
7. `terminationCriteria`
8. `scheduler`
9. `dataAnalytics` (optional)

This ordering puts global elements (functions and variables) before the environment, which makes logical sense as they can be referenced by environment, agents, and other components.

The `ZodToStructuredOutputConverter` preserves this order via a `propertyOrdering` field in the JSON Schema, which some LLMs use as a hint for output ordering.

## Key Schema Features

1. **Nested Structure**: The main model is wrapped in a `model` property, with `explanation` and `title` at the top level
2. **Arrays Everywhere**: All collections use arrays instead of objects/dictionaries
3. **Strict Typing**: `ValueType` union restricts values to string, number, or boolean
4. **Function Calls**: Values can be literals or function calls (via `ValueOrFunction` union)
5. **Nested Agents**: Agents are a nested array: `z.array(z.array(Agent))`
6. **CamelCase Naming**: All properties use camelCase (e.g., `sourceName`, `checkTime`)
7. **Property Ordering**: Determined by Zod schema definition order, preserved in `propertyOrdering` field

## Example Expected Output

The LLM should return JSON matching this structure:
```json
{
  "model": {
    "codingLanguage": "python",
    "abmLibrary": {
      "name": "mesa",
      "version": "3.0"
    },
    "globalFunctions": [],
    "globalVariables": [],
    "environment": {
      "name": "Forest Ecosystem",
      "description": "...",
      "topology": {
        "type": "grid",
        "description": "...",
        "boundaryConditions": "torus"
      },
      "environmentAttributes": [
        {
          "name": "temperature",
          "description": "...",
          "type": "number",
          "initialValue": 20,
          "sourceName": "environment.environmentAttribute.temperature"
        }
      ],
      "environmentBehaviors": []
    },
    "agents": [
      [
        {
          "agentAttributes": [
            {
              "name": "health",
              "description": "...",
              "type": "number",
              "initialValue": 100,
              "sourceName": "agent.Person.agentAttribute.health"
            }
          ],
          "initialCount": 50,
          "agentBehaviors": []
        }
      ]
    ],
    "terminationCriteria": {
      "maxSteps": 1000,
      "terminationRules": []
    },
    "scheduler": {
      "initialization": {
        "description": "...",
        "initializationOrder": []
      },
      "schedule": {
        "description": "...",
        "scheduleOrder": []
      }
    },
    "dataAnalytics": {
      "trackedVariables": []
    }
  },
  "explanation": "Markdown formatted explanation...",
  "title": "Forest Ecosystem ABM Model"
}
```


# ABM Engine Client Integration Guide

## Overview

The **ABM (Agent-Based Modeling) Quantitative Engine** is a service that generates complete agent-based simulation models from natural language prompts. It uses Large Language Models (LLMs) to convert user descriptions into structured ABM model specifications that can be executed in various simulation frameworks (Mesa, AgentPy, NetLogo, etc.).

## Purpose

This document explains what a **client application** needs to send to the sd-ai server and what it will receive back. Use this guide when implementing client-side code that integrates with the sd-ai ABM engine.

## API Endpoint

**Base URL**: `http://localhost:3001/api/v1` (or your sd-ai server URL)

**Engine Name**: `abm-quant`

## What the Client Should Send

### 1. Get Engine Parameters (Optional - for UI generation)

**Endpoint**: `GET /api/v1/engines/abm-quant/parameters`

**Purpose**: Retrieve the list of parameters this engine accepts. Use this to dynamically generate UI forms.

**Response**:
```json
{
  "success": true,
  "parameters": [
    {
      "name": "prompt",
      "type": "string",
      "required": true,
      "uiElement": "textarea",
      "label": "Prompt",
      "description": "Description of desired model or changes to model."
    },
    {
      "name": "currentModel",
      "type": "json",
      "required": false,
      "defaultValue": "{\"variables\": [], \"relationships\": []}",
      "uiElement": "hidden",
      "description": "javascript object in sd-json format representing current model to anchor changes off of"
    },
    {
      "name": "openAIKey",
      "type": "string",
      "required": false,
      "uiElement": "password",
      "saveForUser": "global",
      "label": "Open AI API Key",
      "description": "Leave blank for the default, or your Open AI key - skprojectXXXXX"
    },
    {
      "name": "googleKey",
      "type": "string",
      "required": false,
      "uiElement": "password",
      "saveForUser": "global",
      "label": "Google API Key",
      "description": "Leave blank for the default, or your Google API key - XXXXXX"
    },
    {
      "name": "anthropicKey",
      "type": "string",
      "required": false,
      "uiElement": "password",
      "saveForUser": "global",
      "label": "Anthropic API Key",
      "description": "Leave blank for the default, or your Anthropic API key - sk-ant-XXXXXX"
    },
    {
      "name": "underlyingModel",
      "type": "string",
      "defaultValue": "gemini-2.5-flash-preview-09-2025",
      "required": false,
      "options": [
        {"label": "GPT-5", "value": "gpt-5"},
        {"label": "GPT-4o", "value": "gpt-4o"},
        {"label": "Gemini 2.5-flash", "value": "gemini-2.5-flash"},
        // ... more models
      ],
      "uiElement": "combobox",
      "saveForUser": "local",
      "label": "LLM Model",
      "description": "The LLM model that you want to use to process your queries."
    }
  ]
}
```

### 2. Generate ABM Model

**Endpoint**: `POST /api/v1/engines/abm-quant/generate`

**Headers**:
- `Content-Type: application/json`
- `Authentication: <your-auth-key>` (if server requires authentication and no API key provided)

**Request Body**:
```json
{
  "prompt": "write me an SIR abm network model using python and mesa.",
  "currentModel": null,  // Optional: existing model for iterative refinement
  "underlyingModel": "gpt-5",  // Optional: defaults to gemini-2.5-flash-preview-09-2025
  "openAIKey": "sk-proj-...",  // Optional: if using OpenAI models
  "googleKey": "AIza...",  // Optional: if using Gemini models
  "anthropicKey": "sk-ant-..."  // Optional: if using Claude models
}
```

#### Required Fields

- **`prompt`** (string, required): Natural language description of the desired ABM model or changes to make to an existing model.
  - Examples:
    - `"Create a predator-prey model with wolves and rabbits"`
    - `"Add a disease spread mechanism to the existing SIR model"`
    - `"Modify the agent movement behavior to use random walk"`

#### Optional Fields

- **`currentModel`** (object, optional): Existing ABM model structure for iterative refinement. If provided, the engine will modify this model based on the prompt rather than creating a new one.
  - Format: The model structure returned from a previous call (see Response Format below)
  - Default: `null` (creates new model)

- **`underlyingModel`** (string, optional): Which LLM to use for generation.
  - Default: `"gemini-2.5-flash-preview-09-2025"`
  - Options: See `/parameters` endpoint for full list
  - Examples: `"gpt-5"`, `"gpt-4o"`, `"gemini-2.5-flash"`, `"claude-sonnet-4-5-20250929"`

- **`openAIKey`** (string, optional): OpenAI API key if using OpenAI models. Leave blank to use server's default key or if using other providers.

- **`googleKey`** (string, optional): Google API key if using Gemini models. Leave blank to use server's default key or if using other providers.

- **`anthropicKey`** (string, optional): Anthropic API key if using Claude models. Leave blank to use server's default key or if using other providers.

**Note**: At least one API key must be provided (either in the request or configured on the server) matching the selected model type.

## What the Client Will Receive

### Success Response

**Status Code**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "model": {
    "codingLanguage": "python",
    "abmLibrary": {
      "name": "mesa",
      "version": "3.0"
    },
    "globalFunctions": [
      {
        "name": "calculateDistance",
        "sourceName": "globalFunction.calculateDistance",
        "functionDescription": "Computes Euclidean distance between two points",
        "functionInputs": [
          {
            "name": "x1",
            "description": "X coordinate of first point",
            "type": "number",
            "optional": false,
            "defaultValue": null
          },
          {
            "name": "y1",
            "description": "Y coordinate of first point",
            "type": "number",
            "optional": false,
            "defaultValue": null
          }
        ],
        "functionOutputs": [
          {
            "name": "distance",
            "description": "Euclidean distance",
            "type": "number"
          }
        ],
        "executionMode": "model-once",
        "code": "def calculateDistance(x1, y1, x2, y2):\n    \"\"\"Calculate Euclidean distance.\"\"\"\n    return ((x2 - x1)**2 + (y2 - y1)**2)**0.5"
      }
    ],
    "globalVariables": [
      {
        "name": "population",
        "description": "Total population count",
        "type": "number",
        "initialValue": 1000,
        "sourceName": "globalVariable.population"
      }
    ],
    "environment": {
      "name": "Forest Ecosystem",
      "description": "A grid-based forest environment",
      "topology": {
        "description": "A toroidal grid representing a wrap-around world",
        "type": "grid",
        "boundaryConditions": "torus"
      },
      "environmentAttributes": [
        {
          "name": "temperature",
          "description": "Ambient temperature in the environment",
          "type": "number",
          "initialValue": 20,
          "sourceName": "environment.environmentAttribute.temperature"
        }
      ],
      "environmentBehaviors": [
        {
          "name": "updateTemperature",
          "description": "Updates temperature based on time of day",
          "inputs": [],
          "outputs": [],
          "executionMode": "model-once",
          "code": "def updateTemperature(self):\n    \"\"\"Update temperature.\"\"\"\n    self.temperature = 20 + 10 * math.sin(self.model.schedule.time / 24)",
          "sourceName": "environment.environmentBehavior.updateTemperature"
        }
      ]
    },
    "agents": [
      [
        {
          "agentAttributes": [
            {
              "name": "health",
              "description": "Agent health level",
              "type": "number",
              "initialValue": 100,
              "sourceName": "agent.Person.agentAttribute.health"
            },
            {
              "name": "position",
              "description": "Agent position on grid",
              "type": "object",
              "initialValue": {
                "function": "randomPosition",
                "args": []
              },
              "sourceName": "agent.Person.agentAttribute.position"
            }
          ],
          "initialCount": 50,
          "agentBehaviors": [
            {
              "name": "move",
              "description": "Move agent to random adjacent cell",
              "inputs": [],
              "outputs": [],
              "executionMode": "per-agent",
              "sourceName": "agent.Person.agentBehavior.move",
              "code": "def move(self):\n    \"\"\"Move to random adjacent cell.\"\"\"\n    possible_steps = self.model.grid.get_neighborhood(\n        self.pos, moore=True, include_center=False\n    )\n    new_position = self.random.choice(possible_steps)\n    self.model.grid.move_agent(self, new_position)"
            }
          ]
        }
      ]
    ],
    "terminationCriteria": {
      "maxSteps": 1000,
      "terminationRules": [
        {
          "sourceName": "globalVariable.population",
          "description": "Stop when population reaches zero",
          "type": "number",
          "value": 0
        }
      ]
    },
    "scheduler": {
      "initialization": {
        "description": "Initialize environment, then agents, then global variables",
        "initializationOrder": [
          {
            "sourceName": "environment.environmentAttribute.temperature",
            "type": "environmentAttribute",
            "orderInInitialization": 1
          },
          {
            "sourceName": "agent.Person.initialCount",
            "type": "initialCount",
            "orderInInitialization": 2
          }
        ]
      },
      "schedule": {
        "description": "Update environment, then move agents",
        "scheduleOrder": [
          {
            "sourceName": "environment.environmentBehavior.updateTemperature",
            "type": "environmentBehavior",
            "orderInSchedule": 1
          },
          {
            "sourceName": "agent.Person.agentBehavior.move",
            "type": "agentBehavior",
            "orderInSchedule": 2
          }
        ]
      }
    },
    "dataAnalytics": {
      "trackedVariables": [
        {
          "description": "Track population over time",
          "sourceName": "globalVariable.population",
          "collectionLevel": "model",
          "checkTime": "end-of-step"
        },
        {
          "description": "Track individual agent health",
          "sourceName": "agent.Person.agentAttribute.health",
          "collectionLevel": "agent",
          "checkTime": "end-of-step"
        }
      ]
    }
  },
  "supportingInfo": {
    "explanation": "This model simulates a forest ecosystem with agents that move randomly. The environment has a temperature that varies with time. Agents have health attributes that can be tracked over the simulation.",
    "title": "Forest Ecosystem ABM Model"
  }
}
```

### Response Structure

#### Top-Level Fields

- **`success`** (boolean): Always `true` for successful responses
- **`model`** (object): The complete ABM model specification (see Model Structure below)
- **`supportingInfo`** (object): Additional metadata about the generated model
  - **`explanation`** (string): Markdown-formatted explanation of the model
  - **`title`** (string): Short descriptive title (max 7 words)

#### Model Structure

The `model` object contains the complete ABM specification with the following structure (in order):

1. **`codingLanguage`** (string, required): Programming language for the model (e.g., `"python"`, `"julia"`, `"r"`, `"java"`, `"netlogo"`)

2. **`abmLibrary`** (object, optional): ABM framework/library configuration
   - **`name`** (string): Library name (e.g., `"mesa"`, `"agentpy"`, `"NetLogo"`)
   - **`version`** (string, optional): Library version (e.g., `"3.0"`, `"2.x"`)

3. **`globalFunctions`** (array, optional): Reusable helper functions accessible throughout the model
   - Each function has: `name`, `sourceName`, `functionDescription`, `functionInputs`, `functionOutputs`, `executionMode`, `code`

4. **`globalVariables`** (array, optional): Global variables accessible throughout the model
   - Each variable has: `name`, `description`, `type`, `initialValue`, `sourceName`

5. **`environment`** (object, required): The simulation environment/world
   - **`name`** (string): Environment name
   - **`description`** (string): Description of the environment
   - **`topology`** (object): Spatial structure
     - **`type`**: `"none"`, `"grid"`, or `"network"`
     - **`boundaryConditions`** (optional): `"fixed"` or `"torus"` (for grid topology)
   - **`environmentAttributes`** (array, optional): Environment-level properties
   - **`environmentBehaviors`** (array, optional): Functions that affect the environment

6. **`agents`** (array, required): Agent types (nested array structure)
   - Outer array: Array of agent type groups
   - Inner array: Array of agent types in that group
   - Each agent has: `agentAttributes`, `initialCount`, `agentBehaviors`

7. **`terminationCriteria`** (object, required): Conditions that end the simulation
   - **`maxSteps`** (number): Maximum simulation steps (fallback)
   - **`terminationRules`** (array, optional): Rules that trigger termination
     - Each rule has a **`sourceName`** (required) that references the variable being monitored (e.g., `"globalVariable.population"`)
     - Each rule has a **`value`** that represents the target condition

8. **`scheduler`** (object, required): Execution order and initialization logic
   - **`initialization`**: Order of initialization operations
   - **`schedule`**: Order of operations each simulation step

9. **`dataAnalytics`** (object, optional): Variables to track during simulation
   - **`trackedVariables`** (array): Variables to record

### Error Response

**Status Code**: `200 OK` (errors are returned with success: false)

**Response Body**:
```json
{
  "success": false,
  "message": "Request failed: Error: To access this service you need to send a Google key"
}
```

**Common Error Scenarios**:
- Missing API key for selected model type
- Invalid authentication header (if server requires it)
- Engine not found (404)
- LLM generation failure
- Invalid model structure

## Key Concepts for Client Implementation

### 1. Iterative Model Refinement

The `currentModel` parameter allows iterative refinement:
- **First call**: Send `currentModel: null` or omit it to create a new model
- **Subsequent calls**: Send the `model` object from the previous response to modify it
- The engine will consider the existing model when generating changes

### 2. Source Names

Every element in the model has a `sourceName` that provides a fully qualified reference:
- Global functions: `"globalFunction.calculateDistance"`
- Global variables: `"globalVariable.population"`
- Environment attributes: `"environment.environmentAttribute.temperature"`
- Agent attributes: `"agent.Person.agentAttribute.health"`
- Agent behaviors: `"agent.Person.agentBehavior.move"`

These are used for referencing elements in code, initialization order, and scheduling.

### 3. Value Types

Values can be:
- **Literals**: `5`, `"hello"`, `true`
- **Function calls**: `{ "function": "calculateDistance", "args": [0, 0, 1, 1] }`
- **References**: String references to `sourceName` values (e.g., `"globalVariable.population"`)

### 4. Execution Modes

Functions and behaviors have execution modes:
- **`per-agent`**: Run once for each agent instance
- **`model-once`**: Run once in the model context
- **`model-batch`**: Run once with access to batch collections (e.g., all agents)

### 5. Agent Structure

Agents use a nested array structure: `agents: [[agent1, agent2], [agent3]]`
- The outer array represents groups of agent types
- The inner arrays contain individual agent type definitions
- This allows for complex multi-agent systems

## Example Client Code Flow

```javascript
// 1. Get available parameters (optional)
const paramsResponse = await fetch('http://localhost:3001/api/v1/engines/abm-quant/parameters');
const { parameters } = await paramsResponse.json();

// 2. Generate initial model
const generateResponse = await fetch('http://localhost:3001/api/v1/engines/abm-quant/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authentication': 'your-auth-key' // if required
  },
  body: JSON.stringify({
    prompt: "Create a predator-prey model with wolves and rabbits",
    underlyingModel: "gpt-5",
    openAIKey: "sk-proj-..." // or use server default
  })
});

const result = await generateResponse.json();

if (result.success) {
  const model = result.model;
  const explanation = result.supportingInfo.explanation;
  const title = result.supportingInfo.title;
  
  // Use the model...
  
  // 3. Iteratively refine the model
  const refineResponse = await fetch('http://localhost:3001/api/v1/engines/abm-quant/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: "Add disease spread mechanism to the rabbits",
      currentModel: model, // Pass the existing model
      underlyingModel: "gpt-5"
    })
  });
  
  const refinedResult = await refineResponse.json();
  // ... handle refined model
}
```

## Summary

**What to Export from Client**:
- User's natural language prompt
- Optional: Existing model for refinement
- Optional: LLM model selection and API keys
- Optional: Authentication header

**What Client Receives**:
- Complete ABM model specification with:
  - Code in the specified language/framework
  - Agent definitions with attributes and behaviors
  - Environment configuration
  - Scheduler and initialization logic
  - Data tracking configuration
- Supporting information (explanation and title)

The client can then use this model specification to:
- Generate executable simulation code
- Visualize the model structure
- Run simulations
- Export to various ABM frameworks
- Further refine through iterative API calls


# ABM Engine Output Format

This document describes the exact JSON format that sd-ai returns when generating ABM (Agent-Based Modeling) models using the `abm-quant` engine.

## API Response Structure

### Success Response

**HTTP Status**: `200 OK`

**Response Format**:
```json
{
  "success": true,
  "model": {
    // Complete ABM model specification (see Model Structure below)
  },
  "supportingInfo": {
    "explanation": "Markdown-formatted explanation of the model",
    "title": "Short descriptive title (max 7 words)"
  }
}
```

### Error Response

**HTTP Status**: `200 OK` (errors are returned with `success: false`)

**Response Format**:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Model Structure

The `model` object contains the complete ABM specification. All properties use **camelCase** naming and arrays are used for collections (not objects/dictionaries).

### Property Order

Properties appear in this order:
1. `codingLanguage`
2. `abmLibrary` (optional)
3. `globalFunctions` (optional)
4. `globalVariables` (optional)
5. `environment` (required)
6. `agents` (required)
7. `terminationCriteria` (required)
8. `scheduler` (required)
9. `dataAnalytics` (optional)

### Field Definitions

#### Top-Level Fields

- **`codingLanguage`** (string, required): Programming language for all code in the model
  - Examples: `"python"`, `"julia"`, `"r"`, `"java"`, `"netlogo"`

- **`abmLibrary`** (object, optional): ABM framework/library configuration
  ```json
  {
    "name": "mesa",
    "version": "3.0"
  }
  ```
  - **`name`** (string, required): Library name (e.g., `"mesa"`, `"agentpy"`, `"NetLogo"`)
  - **`version`** (string, optional): Library version (e.g., `"3.0"`, `"2.x"`)

- **`globalFunctions`** (array, optional): Reusable helper functions
  - Array of `GlobalFunction` objects (see below)

- **`globalVariables`** (array, optional): Global variables accessible throughout model
  - Array of `GlobalVariable` objects (see below)

- **`environment`** (object, required): Simulation environment/world
  - See Environment Structure below

- **`agents`** (array, required): Agent type definitions
  - Nested array structure: `[[agentType1, agentType2], [agentType3]]`
  - See Agent Structure below

- **`terminationCriteria`** (object, required): Conditions that end simulation
  - See Termination Criteria below

- **`scheduler`** (object, required): Execution order and initialization
  - See Scheduler Structure below

- **`dataAnalytics`** (object, optional): Variables to track during simulation
  - See Data Analytics below

#### GlobalFunction Structure

```json
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
  "code": "def calculateDistance(x1, y1, x2, y2):\n    \"\"\"Calculate distance.\"\"\"\n    return ((x2-x1)**2 + (y2-y1)**2)**0.5"
}
```

- **`name`** (string): Function name
- **`sourceName`** (string): Fully qualified reference (e.g., `"globalFunction.calculateDistance"`)
- **`functionDescription`** (string): Plain-language description
- **`functionInputs`** (array, optional): Input parameters
- **`functionOutputs`** (array, optional): Output parameters
- **`executionMode`** (string): `"per-agent"`, `"model-once"`, or `"model-batch"`
- **`code`** (string): Complete function implementation in `codingLanguage`

#### GlobalVariable Structure

```json
{
  "name": "population",
  "description": "Total population count",
  "type": "number",
  "initialValue": 1000,
  "sourceName": "globalVariable.population"
}
```

- **`name`** (string): Variable name
- **`description`** (string): Description of what it represents
- **`type`** (string): `"integer"`, `"float"`, `"number"`, `"string"`, `"boolean"`, `"array"`, or `"object"`
- **`initialValue`**: Can be:
  - Literal: `1000`, `"hello"`, `true`
  - Function call: `{ "function": "calculateInitial", "args": [10, 20] }`
  - Reference string: `"globalVariable.otherVar"`
- **`sourceName`** (string): Fully qualified reference

#### Environment Structure

```json
{
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
      "description": "Ambient temperature",
      "type": "number",
      "initialValue": 20,
      "sourceName": "environment.environmentAttribute.temperature"
    }
  ],
  "environmentBehaviors": [
    {
      "name": "updateTemperature",
      "description": "Updates temperature based on time",
      "inputs": [],
      "outputs": [],
      "executionMode": "model-once",
      "code": "def updateTemperature(self):\n    self.temperature = 20 + 10 * math.sin(self.model.schedule.time / 24)",
      "sourceName": "environment.environmentBehavior.updateTemperature"
    }
  ]
}
```

- **`name`** (string): Environment name
- **`description`** (string): Description
- **`topology`** (object, required):
  - **`description`** (string): Human-readable topology description
  - **`type`** (string): `"none"`, `"grid"`, or `"network"`
  - **`boundaryConditions`** (string, optional): `"fixed"` or `"torus"` (for grid only)
- **`environmentAttributes`** (array, optional): Environment-level properties (same structure as GlobalVariable)
- **`environmentBehaviors`** (array, optional): Functions affecting environment (same structure as GlobalFunction, but with `sourceName`)

#### Agent Structure

Agents use a **nested array structure**: `agents: [[agentType1], [agentType2, agentType3]]`

```json
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
      "description": "Agent position",
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
      "description": "Move to random adjacent cell",
      "inputs": [],
      "outputs": [],
      "executionMode": "per-agent",
      "sourceName": "agent.Person.agentBehavior.move",
      "code": "def move(self):\n    possible_steps = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)\n    new_position = self.random.choice(possible_steps)\n    self.model.grid.move_agent(self, new_position)"
    }
  ]
}
```

- **`agentAttributes`** (array, required): Agent properties (same structure as GlobalVariable)
- **`initialCount`**: Number of agents of this type
  - Can be: integer literal, reference string, or function call
- **`agentBehaviors`** (array, optional): Agent behaviors (same structure as GlobalFunction, but with `sourceName`)

#### TerminationCriteria Structure

```json
{
  "maxSteps": 1000,
  "terminationRules": [
    {
      "sourceName": "globalVariable.population",
      "description": "Stop when population reaches zero",
      "type": "number",
      "value": 0
    }
  ]
}
```

- **`maxSteps`** (number, required): Maximum simulation steps (fallback)
- **`terminationRules`** (array, optional): Rules that trigger termination
  - **`sourceName`** (string, required): The sourceName of the variable/attribute being monitored (e.g., `"globalVariable.population"`, `"environment.environmentAttribute.temperature"`, `"agent.Person.agentAttribute.health"`)
  - **`description`** (string): What this rule monitors
  - **`type`** (string): Data type of the value
  - **`value`**: Target value (literal, function call, or reference) - the simulation ends when the variable referenced by `sourceName` equals this value

#### Scheduler Structure

```json
{
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
}
```

- **`initialization`** (object, required):
  - **`description`** (string): Description of initialization steps
  - **`initializationOrder`** (array): Ordered list of items to initialize
    - **`sourceName`** (string): Reference to what's being initialized
    - **`type`** (string): `"agentAttribute"`, `"environmentAttribute"`, `"globalVariable"`, `"globalFunction"`, or `"initialCount"`
    - **`orderInInitialization`** (number): Position in sequence (1=first, 2=second, etc.)

- **`schedule`** (object, required):
  - **`description`** (string): Description of schedule sequence
  - **`scheduleOrder`** (array): Ordered list of operations each step
    - **`sourceName`** (string): Reference to what's being executed
    - **`type`** (string): `"agentBehavior"`, `"environmentBehavior"`, or `"globalFunction"`
    - **`orderInSchedule`** (number): Position in sequence

#### DataAnalytics Structure

```json
{
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
```

- **`trackedVariables`** (array, optional): Variables to record
  - **`description`** (string): Why this variable is tracked
  - **`sourceName`** (string): Reference to variable being tracked
  - **`collectionLevel`** (string): `"model"` (once per step) or `"agent"` (per agent per step)
  - **`checkTime`** (string): `"start-of-step"` or `"end-of-step"`

#### SupportingInfo Structure

```json
{
  "explanation": "This model simulates a forest ecosystem...",
  "title": "Forest Ecosystem ABM Model"
}
```

- **`explanation`** (string): Markdown-formatted explanation of the model
- **`title`** (string): Short descriptive title (max 7 words)

## Complete Example

Here's a complete example of an ABM model output for a simple SIR (Susceptible-Infected-Recovered) epidemic model:

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
        "name": "calculateInfectionProbability",
        "sourceName": "globalFunction.calculateInfectionProbability",
        "functionDescription": "Calculates probability of infection based on contact rate and transmission rate",
        "functionInputs": [
          {
            "name": "contactRate",
            "description": "Number of contacts per time step",
            "type": "number",
            "optional": false,
            "defaultValue": null
          },
          {
            "name": "transmissionRate",
            "description": "Probability of transmission per contact",
            "type": "number",
            "optional": false,
            "defaultValue": null
          }
        ],
        "functionOutputs": [
          {
            "name": "probability",
            "description": "Overall infection probability",
            "type": "number"
          }
        ],
        "executionMode": "model-once",
        "code": "def calculateInfectionProbability(contactRate, transmissionRate):\n    \"\"\"Calculate infection probability.\"\"\"\n    return 1 - (1 - transmissionRate) ** contactRate"
      }
    ],
    "globalVariables": [
      {
        "name": "totalPopulation",
        "description": "Total number of agents in the simulation",
        "type": "number",
        "initialValue": 1000,
        "sourceName": "globalVariable.totalPopulation"
      },
      {
        "name": "infectionRate",
        "description": "Base infection transmission rate",
        "type": "number",
        "initialValue": 0.3,
        "sourceName": "globalVariable.infectionRate"
      },
      {
        "name": "recoveryRate",
        "description": "Probability of recovery per time step",
        "type": "number",
        "initialValue": 0.1,
        "sourceName": "globalVariable.recoveryRate"
      }
    ],
    "environment": {
      "name": "Network Environment",
      "description": "A network-based environment where agents are connected in a social network",
      "topology": {
        "description": "A scale-free network representing social connections",
        "type": "network",
        "boundaryConditions": null
      },
      "environmentAttributes": [],
      "environmentBehaviors": []
    },
    "agents": [
      [
        {
          "agentAttributes": [
            {
              "name": "status",
              "description": "Disease status: S (susceptible), I (infected), or R (recovered)",
              "type": "string",
              "initialValue": "S",
              "sourceName": "agent.Person.agentAttribute.status"
            },
            {
              "name": "infectionTime",
              "description": "Time step when agent became infected",
              "type": "number",
              "initialValue": -1,
              "sourceName": "agent.Person.agentAttribute.infectionTime"
            },
            {
              "name": "recoveryTime",
              "description": "Time step when agent recovered",
              "type": "number",
              "initialValue": -1,
              "sourceName": "agent.Person.agentAttribute.recoveryTime"
            }
          ],
          "initialCount": {
            "function": "getTotalPopulation",
            "args": []
          },
          "agentBehaviors": [
            {
              "name": "checkInfection",
              "description": "Check if agent becomes infected from neighbors",
              "inputs": [],
              "outputs": [],
              "executionMode": "per-agent",
              "sourceName": "agent.Person.agentBehavior.checkInfection",
              "code": "def checkInfection(self):\n    \"\"\"Check for infection from neighbors.\"\"\"\n    if self.status != 'S':\n        return\n    \n    infected_neighbors = [n for n in self.model.grid.get_neighbors(self.pos, include_center=False) \n                          if n.status == 'I']\n    \n    if len(infected_neighbors) > 0:\n        contact_rate = len(infected_neighbors)\n        prob = globalFunction.calculateInfectionProbability(contact_rate, globalVariable.infectionRate)\n        if self.random.random() < prob:\n            self.status = 'I'\n            self.infectionTime = self.model.schedule.time"
            },
            {
              "name": "checkRecovery",
              "description": "Check if infected agent recovers",
              "inputs": [],
              "outputs": [],
              "executionMode": "per-agent",
              "sourceName": "agent.Person.agentBehavior.checkRecovery",
              "code": "def checkRecovery(self):\n    \"\"\"Check for recovery.\"\"\"\n    if self.status == 'I' and self.random.random() < globalVariable.recoveryRate:\n        self.status = 'R'\n        self.recoveryTime = self.model.schedule.time"
            }
          ]
        }
      ]
    ],
    "terminationCriteria": {
      "maxSteps": 200,
      "terminationRules": [
        {
          "sourceName": "globalVariable.infectedCount",
          "description": "Stop when no infected agents remain",
          "type": "number",
          "value": 0
        }
      ]
    },
    "scheduler": {
      "initialization": {
        "description": "Initialize global variables, then create network, then create agents with initial infected population",
        "initializationOrder": [
          {
            "sourceName": "globalVariable.totalPopulation",
            "type": "globalVariable",
            "orderInInitialization": 1
          },
          {
            "sourceName": "globalVariable.infectionRate",
            "type": "globalVariable",
            "orderInInitialization": 2
          },
          {
            "sourceName": "globalVariable.recoveryRate",
            "type": "globalVariable",
            "orderInInitialization": 3
          },
          {
            "sourceName": "agent.Person.initialCount",
            "type": "initialCount",
            "orderInInitialization": 4
          }
        ]
      },
      "schedule": {
        "description": "First check for infections, then check for recoveries",
        "scheduleOrder": [
          {
            "sourceName": "agent.Person.agentBehavior.checkInfection",
            "type": "agentBehavior",
            "orderInSchedule": 1
          },
          {
            "sourceName": "agent.Person.agentBehavior.checkRecovery",
            "type": "agentBehavior",
            "orderInSchedule": 2
          }
        ]
      }
    },
    "dataAnalytics": {
      "trackedVariables": [
        {
          "description": "Track total susceptible population",
          "sourceName": "agent.Person.agentAttribute.status",
          "collectionLevel": "agent",
          "checkTime": "end-of-step"
        },
        {
          "description": "Track total population",
          "sourceName": "globalVariable.totalPopulation",
          "collectionLevel": "model",
          "checkTime": "end-of-step"
        }
      ]
    }
  },
  "supportingInfo": {
    "explanation": "This SIR epidemic model simulates disease spread through a network of agents. Agents start as Susceptible (S), can become Infected (I) through contact with infected neighbors, and then Recover (R) with a certain probability each time step. The model uses a network topology to represent social connections, and tracks the progression of the epidemic over time.",
    "title": "SIR Network Epidemic Model"
  }
}
```

## Key Points

1. **Arrays, not Objects**: All collections (`globalFunctions`, `globalVariables`, `environmentAttributes`, etc.) are arrays, not key-value objects.

2. **CamelCase Naming**: All property names use camelCase (e.g., `sourceName`, `checkTime`, `initialValue`).

3. **Source Names**: Every element has a `sourceName` providing a fully qualified reference path (e.g., `"agent.Person.agentAttribute.health"`).

4. **Value Flexibility**: `initialValue` and similar fields can be:
   - Literals: `100`, `"hello"`, `true`
   - Function calls: `{ "function": "calculate", "args": [1, 2] }`
   - References: `"globalVariable.population"`

5. **Nested Agent Arrays**: Agents use `[[agentType1], [agentType2]]` structure - outer array for groups, inner arrays for agent types.

6. **Code Strings**: All `code` fields contain complete, executable code in the specified `codingLanguage`.

7. **Order Matters**: Properties appear in a specific order (globalFunctions → globalVariables → environment → agents → etc.).

## Usage

This format can be used to:
- Generate executable simulation code
- Visualize model structure
- Export to various ABM frameworks
- Validate model completeness
- Iteratively refine models through subsequent API calls


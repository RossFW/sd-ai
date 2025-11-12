# Termination Rule Schema Update

## Summary

The `TerminationRule` schema has been updated to include a **required `sourceName` field**. This change enables proper validation of termination rules and ensures that each rule explicitly references the variable/attribute it monitors.

## Change Details

### Previous Format (Dictionary-based)
```json
"terminationRules": {
  "globalVariable.population": {
    "description": "Stop when population reaches zero",
    "type": "integer",
    "value": 0
  }
}
```

### New Format (Array-based with sourceName)
```json
"terminationRules": [
  {
    "sourceName": "globalVariable.population",
    "description": "Stop when population reaches zero",
    "type": "integer",
    "value": 0
  }
]
```

## Why This Change Was Needed

1. **Validation**: The old format used dictionary keys to identify which variable was being monitored, but when we converted to arrays (to match sd-ai output format), we lost the ability to validate that the referenced variable actually exists.

2. **Explicit References**: The `value` field represents the target value (e.g., `0`, `100`, `true`), not the sourceName of the variable being monitored. We need a separate `sourceName` field to explicitly identify what is being checked.

3. **Consistency**: All other entities in the schema (globalVariables, environmentAttributes, agentAttributes, trackedVariables, scheduler items) use `sourceName` for explicit references. Termination rules should follow the same pattern.

## Updated Schema Structure

### TerminationRule Object

```typescript
{
  sourceName: string;      // REQUIRED - The sourceName of the variable/attribute being monitored
  description: string;     // REQUIRED - Plain-language explanation
  type: string;            // REQUIRED - Data type of the value (e.g., "integer", "float", "boolean")
  value: ValueOrFunction;  // REQUIRED - Target value that triggers termination
}
```

### sourceName Format

The `sourceName` must reference a defined variable/attribute:
- `"globalVariable.{name}"` - References a global variable
- `"environment.environmentAttribute.{name}"` - References an environment attribute
- `"agent.{AgentType}.agentAttribute.{name}"` - References an agent attribute

### Examples

#### Example 1: Global Variable Termination
```json
{
  "sourceName": "globalVariable.population",
  "description": "Stop when population reaches zero",
  "type": "integer",
  "value": 0
}
```

#### Example 2: Environment Attribute Termination
```json
{
  "sourceName": "environment.environmentAttribute.temperature",
  "description": "Stop when temperature exceeds threshold",
  "type": "float",
  "value": 100.0
}
```

#### Example 3: Agent Attribute Termination (with function call)
```json
{
  "sourceName": "agent.Person.agentAttribute.health",
  "description": "Stop when all agents are dead",
  "type": "integer",
  "value": {
    "function": "countAliveAgents",
    "args": []
  }
}
```

## Required Updates in Zod Schema

### 1. Update TerminationRule Schema

Add `sourceName` as a required field:

```typescript
const TerminationRuleSchema = z.object({
  sourceName: z.string()
    .describe("The sourceName of the variable/attribute being monitored (e.g., 'globalVariable.population', 'environment.environmentAttribute.temperature'). This must reference a defined globalVariable, environmentAttribute, or agentAttribute."),
  description: z.string()
    .describe("A plain-language explanation of what this termination rule monitors and why it ends the simulation."),
  type: z.string()
    .describe("The data type of the end condition's value (integer, float, boolean, etc.)."),
  value: ValueOrFunctionSchema
    .describe("The target value that triggers termination. The simulation ends when the variable referenced by sourceName equals this value.")
});
```

### 2. Update Generation Logic

When generating termination rules, ensure that:
- Each rule includes a `sourceName` field that references the variable being monitored
- The `sourceName` follows the correct format (`globalVariable.*`, `environment.environmentAttribute.*`, or `agent.*.agentAttribute.*`)
- The `value` field contains the target value, not the sourceName

### 3. Validation (Optional but Recommended)

Consider adding validation in the Zod schema to ensure:
- `sourceName` follows the correct format pattern
- `sourceName` references a valid variable type (globalVariable, environmentAttribute, or agentAttribute)

## Migration Notes

### For Existing Schemas

If you have existing schemas that use the old format (dictionary keys), they will need to be migrated:

**Old:**
```json
"terminationRules": {
  "globalVariable.population": {
    "description": "...",
    "type": "integer",
    "value": 0
  }
}
```

**New:**
```json
"terminationRules": [
  {
    "sourceName": "globalVariable.population",
    "description": "...",
    "type": "integer",
    "value": 0
  }
]
```

The dictionary key becomes the `sourceName` field value.

## Testing

The updated schema has been tested with:
- ✅ Pydantic validation (Python client-side)
- ✅ Mesa code generation (`schema_to_mesa.py`)
- ✅ Example JSON files

All validation passes successfully with the new format.

## Questions or Issues

If you have questions about this change or encounter any issues implementing it in the Zod schema, please let us know. We're happy to help clarify or adjust as needed.


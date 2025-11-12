# underlyingModel Parameter Behavior in sd-ai

## Answers to Client Questions

### Question 1: If `underlyingModel` is `None` or an empty string, does the server ignore it and default to Gemini?

**Answer: YES** - The server will default to Gemini (`gemini-2.5-flash-preview-09-2025`).

**How it works:**

1. **Route Handler** (`routes/v1/engineGenerate.js` line 22):
   ```javascript
   const underlyingModel = req.body.underlyingModel || LLMWrapper.DEFAULT_MODEL;
   ```
   - JavaScript's `||` operator treats these as falsy and defaults:
     - `undefined` → defaults to `DEFAULT_MODEL` (Gemini)
     - `null` → defaults to `DEFAULT_MODEL` (Gemini)
     - `""` (empty string) → defaults to `DEFAULT_MODEL` (Gemini)
     - `0` → defaults to `DEFAULT_MODEL` (Gemini)
     - `false` → defaults to `DEFAULT_MODEL` (Gemini)

2. **LLMWrapper Constructor** (`utilities/LLMWrapper.js` lines 83-84):
   ```javascript
   if (parameters.underlyingModel)
     this.model = new ModelCapabilities(parameters.underlyingModel);
   ```
   - If `underlyingModel` is falsy (empty string, null, undefined), this condition is false
   - The model defaults to `LLMWrapper.DEFAULT_MODEL` (set on line 62, which is Gemini)

### Question 2: Does the server require `underlyingModel` to be a non-empty string, or can it be omitted?

**Answer: It can be omitted** (undefined), but if provided, it must be a non-empty string.

**Behavior:**
- **Omitted** (`undefined`): ✅ Works - defaults to Gemini
- **Empty string** (`""`): ⚠️ Defaults to Gemini (may cause confusion)
- **Valid string** (`"gpt-5-mini"`): ✅ Works - uses specified model
- **Invalid string** (`"invalid-model"`): ⚠️ Will still try to use it (may cause errors later)

### Question 3: If `underlyingModel` is provided but invalid (e.g., empty string), does it fall back to the default or return an error?

**Answer: It falls back to the default** (Gemini) - it does NOT return an error.

**Flow:**
1. Empty string `""` is falsy in JavaScript
2. Route handler: `"" || DEFAULT_MODEL` → uses `DEFAULT_MODEL` (Gemini)
3. LLMWrapper: `if (parameters.underlyingModel)` → false, so uses default (Gemini)
4. No error is thrown - it silently defaults to Gemini

## The Problem This Causes

When `underlyingModel` is an empty string:
1. Server defaults to Gemini
2. Server expects `googleKey` (not `openAIKey`)
3. Client sends `openAIKey` but no `googleKey`
4. Server tries to use Google API with invalid/missing key
5. **Result**: `ApiError: API key not valid` from Google API

## Recommended Client-Side Fix

The other AI's proposed fix is **correct and recommended**. Here's why:

```python
# Ensure we always have a valid model name (never None or empty)
if not selected_model or not selected_model.strip():
    selected_model = "gemini-2.5-flash-preview-09-2025"  # Fallback to default
else:
    selected_model = selected_model.strip()
```

**Why this is good:**
- Prevents empty strings from being sent
- Ensures a valid model is always specified
- If you want to use Gemini, explicitly set it
- If you want OpenAI, explicitly set it (e.g., `"gpt-5-mini"`)

## Better Approach: Explicit Model Selection

However, there's a **better approach** - don't default to Gemini if the user wants OpenAI:

```python
# Get selected model
selected_model = self.get_selected_model()

# If no model selected, use a sensible default based on available API keys
if not selected_model or not selected_model.strip():
    # Check what API keys are available
    if self.get_api_key("openai"):
        selected_model = "gpt-5-mini"  # Default to OpenAI if key available
    elif self.get_api_key("google"):
        selected_model = "gemini-2.5-flash-preview-09-2025"  # Fallback to Gemini
    else:
        raise ValueError("No API keys available and no model specified")
else:
    selected_model = selected_model.strip()

# Validate model name is not empty before sending
if not selected_model:
    raise ValueError("Model name cannot be empty")
```

## Summary

**To answer the questions directly:**

1. ✅ **Yes** - Empty string defaults to Gemini
2. ✅ **Can be omitted** - But if provided, must be non-empty
3. ✅ **Falls back** - No error, just defaults to Gemini

**Recommendation:** The client should validate and ensure `underlyingModel` is always a non-empty, valid string before sending. The proposed fix is good, but consider defaulting based on available API keys rather than always defaulting to Gemini.


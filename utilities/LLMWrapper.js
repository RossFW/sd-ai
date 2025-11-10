import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ZodToStructuredOutputConverter } from "./ZodToStructuredOutputConverter.js";

export const ModelType = Object.freeze({
  GEMINI:   Symbol("Gemini"),
  OPEN_AI:  Symbol("OpenAI"),
  LLAMA: Symbol("Llama"),
  DEEPSEEK: Symbol("Deepseek"),
  CLAUDE: Symbol("Claude")
});


export class ModelCapabilities {
  hasStructuredOutput= true;
  hasSystemMode = true;
  hasTemperature = true;
  systemModeUser = 'system';

  name = 'model';

  constructor(modelName) {
      this.name = modelName;

      this.hasStructuredOutput = modelName !== 'o1-mini';
      this.hasSystemMode = modelName !== 'o1-mini';
      this.hasTemperature = !modelName.startsWith('o') && !modelName.startsWith('gpt-5');
      if (modelName.includes('gemini') || modelName.includes('llama') || modelName.includes('claude')) {
          this.systemModeUser = 'system';
      } else {
          this.systemModeUser = 'developer';
      }
  }

  get kind() {
      if (this.name.includes('gemini')) {
          return ModelType.GEMINI;
      } else if (this.name.includes('llama')) {
          return ModelType.LLAMA;
      } else if (this.name.includes('deepseek')) {
          return ModelType.DEEPSEEK;
      } else if (this.name.includes('claude')) {
          return ModelType.CLAUDE;
      } else {
          return ModelType.OPEN_AI;
      }
  }
};

export class LLMWrapper {
  #openAIKey;
  #googleKey;
  #anthropicKey;
  #openAIAPI = null;
  #geminiAPI = null;
  #anthropicAPI = null;
  #zodToStructuredOutputConverter = new ZodToStructuredOutputConverter();

  model = new ModelCapabilities(LLMWrapper.DEFAULT_MODEL);

  constructor(parameters) {
    if (!parameters.openAIKey) {
        this.#openAIKey = process.env.OPENAI_API_KEY
    } else {
      this.#openAIKey = parameters.openAIKey;
    }

    if (!parameters.googleKey) {
        this.#googleKey = process.env.GOOGLE_API_KEY
    } else {
      this.#googleKey = parameters.googleKey;
    }

    if (!parameters.anthropicKey) {
        this.#anthropicKey = process.env.ANTHROPIC_API_KEY
    } else {
      this.#anthropicKey = parameters.anthropicKey;
    }

    if (parameters.underlyingModel)
      this.model = new ModelCapabilities(parameters.underlyingModel);

    switch (this.model.kind) {
        case ModelType.GEMINI:
            if (!this.#googleKey) {
              throw new Error("To access this service you need to send a Google key");
            }

            this.#geminiAPI = new GoogleGenAI({ apiKey: this.#googleKey });
            break;
        case ModelType.OPEN_AI:
            if (!this.#openAIKey) {
              throw new Error("To access this service you need to send an OpenAI key");
            }

            this.#openAIAPI = new OpenAI({
                apiKey: this.#openAIKey,
            });
            break;
        case ModelType.CLAUDE:
            if (!this.#anthropicKey) {
              throw new Error("To access this service you need to send an Anthropic key");
            }

            this.#anthropicAPI = new Anthropic({
                apiKey: this.#anthropicKey,
            });
            break;
        case ModelType.DEEPSEEK:
        case ModelType.LLAMA:
            this.#openAIAPI = new OpenAI({
                apiKey: 'junk', // required but unused
                baseURL: 'http://localhost:11434/v1',
            });
            break;
    }
  }

  static MODELS = [
      {label: "GPT-5", value: 'gpt-5'},
      {label: "GPT-5-mini", value: 'gpt-5-mini'},
      {label: "GPT-5-nano", value: 'gpt-5-nano'},
      {label: "GPT-4o", value: 'gpt-4o'},
      {label: "GPT-4o-mini", value: 'gpt-4o-mini'},
      {label: "GPT-4.1", value: 'gpt-4.1'},
      {label: "GPT-4.1-mini", value: 'gpt-4.1-mini'},
      {label: "GPT-4.1-nano", value: 'gpt-4.1-nano'},
      {label: "Gemini 2.5-flash", value: 'gemini-2.5-flash'},
      {label: "Gemini 2.5-flash-preview-09-2025", value: 'gemini-2.5-flash-preview-09-2025'},
      {label: "Gemini 2.5-flash-lite", value: 'gemini-2.5-flash-lite'},
      {label: "Gemini 2.5-pro", value: 'gemini-2.5-pro'},
      {label: "Gemini 2.0", value: 'gemini-2.0-flash'},
      {label: "Gemini 2.0-Lite", value: 'gemini-2.0-flash-lite'},
      {label: "Gemini 1.5", value: 'gemini-1.5-flash'},
      {label: "Claude Sonnet 4.5", value: 'claude-sonnet-4-5-20250929'},
      {label: "Claude Opus 4.1", value: 'claude-opus-4-1-20250805'},
      {label: "Claude Sonnet 4", value: 'claude-sonnet-4-20250514'},
      {label: "o1", value: 'o1'},
      {label: "o3-mini low", value: 'o3-mini low'},
      {label: "o3-mini medium", value: 'o3-mini medium'},
      {label: "o3-mini high", value: 'o3-mini high'},
      {label: "o3", value: 'o3'},
      {label: "o4-mini", value: 'o4-mini'}
  ];

  static DEFAULT_MODEL = 'gemini-2.5-flash-preview-09-2025';

  static SCHEMA_STRINGS = {
    "from": "This is a variable which causes the to variable in this relationship that is between two variables, from and to.  The from variable is the equivalent of a cause.  The to variable is the equivalent of an effect",
    "to": "This is a variable which is impacted by the from variable in this relationship that is between two variables, from and to.  The from variable is the equivalent of a cause.  The to variable is the equivalent of an effect",
    "reasoning": "This is an explanation for why this relationship exists",
    "polarity": "There are two possible kinds of relationships.  The first are relationships with positive polarity that are represented with a + symbol.  In relationships with positive polarity (+) a change in the from variable causes a change in the same direction in the to variable.  For example, in a relationship with positive polarity (+), a decrease in the from variable, would lead to a decrease in the to variable.  The second kind of relationship are those with negative polarity that are represented with a - symbol.  In relationships with negative polarity (-) a change in the from variable causes a change in the opposite direction in the to variable.  For example, in a relationship with negative polarity (-) an increase in the from variable, would lead to a decrease in the to variable.",
    "polarityReasoning": "This is the reason for why the polarity for this relationship was chosen",
    "relationship": "This is a relationship between two variables, from and to (from is the cause, to is the effect).  The relationship also contains a polarity which describes how a change in the from variable impacts the to variable",

    "relationships": "The list of relationships you think are appropriate to satisfy my request based on all of the information I have given you",

    "explanation": "Concisely explain your reasoning for each change you made to the old model to create the new model. Speak in plain English, refer to system archetypes, don't reference json specifically. Don't reiterate the request or any of these instructions.",

    "title": "A highly descriptive 7 word max title describing your explanation.",

    "quantExplanation": "This is markdown formatted text. Concisely explain your reasoning for each change you made to the old model to create the new model. Speak in plain English, refer to system archetypes, don't reference json specifically. Don't reiterate the request or any of these instructions.",

    "abmExplanation": "This is markdown formatted text. Concisely explain your reasoning for each change you made to the old model to create the new model. Speak in plain English, don't reference json specifically. Don't reiterate the request or any of these instructions.",

    "mentorModeQuantExplanation": "This is markdown formatted text where you try to teach the user about the model you built, explaining any flaws it may have, or problems that could exist with it. Never enumerate the feedback loops in the model!  This explanation should contain questions for the user customized to their specific context to help them think through their work.  This critique of the model you deliver here should be thorough and complete, leave no reasonable critique of the model unsaid.  Consider any missing concepts or other issues with model scope and construction technqiue.  Help the user to understand if their model is giving them the right behavior for the right reason. Speak in plain English, don't reference json specifically. Don't reiterate the request or any of these instructions.",

    "variables": "The list of variables you think are appropriate to satisfy my request based on all of the information I have given you",

    "equation": "The XMILE equation for this variable.  This equation can be a number, or an algebraic expression of other variables. Make sure that whenever you include a variable name with spaces that you replace those spaces with underscores. If the type for this variable is a stock, then the equation is its initial value, do not use INTEG for the equation of a stock, only its initial value. NEVER use IF THEN ELSE or conditional functions inside of equations.  If you want to check for division by zero use the operator //. If this variable is a table function, lookup function or graphical function, the equation should be an algebraic expression containing only the inputs to the function!  If a variable is making use of a graphical function only the name of the variable with the graphical function should appear in the equation.",

    "type": "There are three types of variables, stock, flow, and variable. A stock is an accumulation of its flows, it is an integral.  A stock can only change because of its flows. A flow is the derivative of a stock.  A plain variable is used for algebraic expressions.",
    "name": "The name of a variable",

    "inflows": "Only used on variables that are of type stock.  It is an array of variable names representing flows that add to this stock.",
    "outflows": "Only used on variables that are of type stock.  It is an array of variable names representing flows that subtract from this stock.",
    "documentation": "Documentation for the variable including the reason why it was chosen, what it represents, and a simple explanation why it is calculated this way",
    "units": "The units of measure for this variable",
    "gfEquation": "Only used on variables which contain a table function, lookup function, or graphical function.",

    "gf": "This object represents a table function, lookup function or graphical function.  It is a list of value pairs or points.  The value computed by the equation is looked up in this list of points using the \"x\" value, and the \"y\" value is returned.",
    "gfPoint": "This object represents a single value pair used in a table function, lookup function, or graphical function.",
    "gfPointX": "This is the \"x\" value in the x,y value pair, or graphical function point. This is the value used for the lookup.",
    "gfPointY": "This is the \"y\" value in the x,y value pair, or graphical function point. This is the value returned by the lookup.",

    "simSpecs": "This object describes settings for the model and how it runs.",
    "startTime": "The time at which this model starts calculating.  It is measured in the units of \"timeUnits\".",
    "stopTime": "The time at which this model stops calculating.  It is measured in the units of \"timeUnits\".",
    "dt": "The time step for the model, how often is it calculated.  The most common dt is 0.25. It is measured in the units of \"timeUnits\".",
    "timeUnits": "The unit of time for this model.  This should match with the equations that you generate.",

    "loopIdentifier": "The globally unique identifer for this feedback loop.  You will take this value from the feedback loop identifier given to you.",
    "loopName": "A short, but unique name, for the process this feedback loop represents.  This name must be distinct for each loop you give a name to. This name should not refer directly to the polarity of the loop.  Don't use the words: growth, decline, stablizing, dampening, balancing, reinforcing, positive or negative in the name.",
    "loopDescription": "A description of what the process this feedback loop represents.  This description should discusses the purpose of this feedback loop. It should not be longer then 3 paragraphs",
    "loopsDescription": "A list of feedback loops with names and descriptions for the end-user.",
    "loopsNarrative": "A markdown formatted string containing an essay consisting of multiple paragraphs (unless instructed to do otherwise) that stitches together the feedback loops and their loopDescriptions into a narrative that describes the origins of behavior in the model. This essay should note each time period where there is a change in loop dominance."
  };

  generateSeldonResponseSchema() {
      return z.object({
        response: z.string().describe("The text containing the response. This text can only contain simple HTML formatted text.  Use only the HTML tags <h4>, <h5>, <h6>, <ol>, <ul>, <li>, <a>, <b>, <i>, <br>, <p> and <span>. Do not use markdown, LaTeX or any other kind of formatting")
      });
  }

  generateLTMNarrativeResponseSchema(removeDescription = false) {
      // Conditionally adds a description to a Zod schema object.
      // If removeDescription is true, it returns the schema without the description.
      const withDescription = (schema, description) => {
          return removeDescription ? schema : schema.describe(description);
      };

      const FeedbackLoop = z.object({
        identifier: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.loopIdentifier),
        name: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.loopName),
        description: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.loopDescription)
      });

      const FeedbackLoopList = withDescription(z.array(FeedbackLoop), LLMWrapper.SCHEMA_STRINGS.loopsDescription);

      const LTMToolResponse = z.object({
        feedbackLoops: FeedbackLoopList,
        narrativeMarkdown: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.loopsNarrative)
      });

      return LTMToolResponse;
  }

  generateQualitativeSDJSONResponseSchema(removeDescription = false) {
      // Conditionally adds a description to a Zod schema object.
      // If removeDescription is true, it returns the schema without the description.
      const withDescription = (schema, description) => {
          return removeDescription ? schema : schema.describe(description);
      };

      const PolarityEnum = withDescription(z.enum(["+", "-"]), LLMWrapper.SCHEMA_STRINGS.polarity);

      const Relationship = withDescription(z.object({
          from: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.from),
          to: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.to),
          polarity: PolarityEnum,
          reasoning: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.reasoning),
          polarityReasoning: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.polarityReasoning)
      }), LLMWrapper.SCHEMA_STRINGS.relationship);

      const Relationships = z.object({
          explanation: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.explanation),
          title: withDescription(z.string(), LLMWrapper.SCHEMA_STRINGS.title),
          relationships: withDescription(z.array(Relationship), LLMWrapper.SCHEMA_STRINGS.relationships)
      });

      return Relationships;
  }
  generateAbmJSONResponseSchema() {
  // ============================================================================
    // Centralized Type Definitions
    // ============================================================================

    const ParameterType = z.enum([
      "integer",
      "float",
      "number",
      "string",
      "boolean",
      "array",
      "object",
    ]);

    const ExecutionMode = z.enum(["per-agent", "model-once", "model-batch"]);

    const CollectionLevel = z.enum(["model", "agent"]);

    // ============================================================================
    // Reusable Models for Repeated Patterns
    // ============================================================================

    const FunctionInputParameter = z.object({
      name: z.string().describe(
        "The name of the input parameter as used in the function signature."
      ),
      description: z.string().describe(
        "Description of what this input parameter exists for this function."
      ),
      type: ParameterType.describe(
        "The data type of the input parameter (integer, float, number, string, boolean, array, or object)"
      ),
      optional: z.boolean().default(false).describe(
        "Whether this parameter is optional. Optional parameters can be omitted when calling the function. Defaults to False (required)."
      ),
      defaultValue: z.any().optional().nullable().describe(
        "Default value used when this optional parameter is not provided. Should only be set when optional=True."
      ),
    });

    const FunctionOutputParameter = z.object({
      name: z.string().describe(
        "The name of the output parameter as returned by the function."
      ),
      description: z.string().describe(
        "Description of what this output parameter exists for this function."
      ),
      type: ParameterType.describe(
        "The data type of the output parameter (integer, float, number, string, boolean, array, or object)"
      ),
    });

    const FunctionCall = z.object({
      function: z.string().describe(
        "The name of the function to call. Must reference a function defined in globalFunctions, environmentBehaviors, or agentBehaviors."
      ),
      args: z.array(z.any()).describe(
        "Arguments to pass to the function. Values can be literals or references to globalVariables, environmentAttributes, agentAttributes, or other defined values in the schema."
      ),
    });

    // Type alias for values that can be literal or function-generated
    const ValueOrFunction = z.union([z.any(), FunctionCall]);

    // ============================================================================
    // Global Functions Schema
    // ============================================================================

    const GlobalFunction = z.object({
      name: z.string().describe("The name of the global function."),
      source_name: z.string().describe(
        "The fully qualified source reference for this function (e.g., if the name is calculateDistance, then the source_name should be 'globalFunction.calculateDistance')."
      ),
      functionDescription: z.string().describe(
        "A plain-language explanation of what the function does, without code. E.g., 'Computes distance between two points.'"
      ),
      functionInputs: z.array(FunctionInputParameter).optional().describe(
        "An array of input parameters for this function. Each entry must include a name, description, type, and a source_name."
      ),
      functionOutputs: z.array(FunctionOutputParameter).optional().describe(
        "An array of output parameters returned by this function. Each entry must include a name, description, type, and a source_name."
      ),
      executionMode: ExecutionMode.describe(
        "Execution mode determines how this function is invoked: 'per-agent' (run once for each agent instance), 'model-once' (run once in the model context), or 'model-batch' (run once with access to batch collections such as all agents)."
      ),
      code: z.string().describe(
        "The complete function implementation in the codingLanguage. Should be a full function definition including signature, docstring, and body. For Python: 'def function_name(params):\\n    \"\"\"Docstring.\"\"\"\\n    # implementation'. Use only variables and functions defined in this schema."
      ),
    });

    // ============================================================================
    // Global Variables Schema
    // ============================================================================

    const GlobalVariable = z.object({
      name: z.string().describe("The name of the global variable."),
      description: z.string().describe(
        "A plain-language explanation of what the global variable represents in the model."
      ),
      type: ParameterType.describe(
        "The data type of the variable (integer, float, number, string, boolean, array, or object)."
      ),
      initialValue: ValueOrFunction.describe(
        "Initial value: can be a literal (5, 'hello', []), a framework attribute reference ('self.unique_id'), or a function call. Framework references are evaluated at runtime."
      ),
      source_name: z.string().describe(
        "The fully qualified source reference for this variable (e.g., if its name is population, then the source_name should be 'globalVariable.population')."
      ),
    });

    // ============================================================================
    // Environment Schema
    // ============================================================================

    const Topology = z.object({
      description: z.string().describe(
        "A human-readable summary of the chosen topology. E.g., 'A toroidal grid representing a wrap-around world.'"
      ),
      type: z.enum(["none", "grid", "network"]).describe(
        "The type of the topology (none, grid, or network)."
      ),
      boundaryConditions: z.enum(["fixed", "torus"]).optional().describe(
        "Only needed for grid topology. Specifies what happens at the edges of the environment (fixed boundaries or torus wrapping)."
      ),
    });

    const EnvironmentAttribute = z.object({
      name: z.string().describe("The name of the environment attribute."),
      description: z.string().describe(
        "Explains what the world attribute represents and why it matters in the simulation. An environment attribute is a property of the environment."
      ),
      type: ParameterType.describe(
        "The data type of the world attribute (integer, float, number, string, boolean, array, or object)."
      ),
      initialValue: ValueOrFunction.describe(
        "Initial value: can be a literal (5, 'hello', []), a framework attribute reference ('self.unique_id'), or a function call. Framework references are evaluated at runtime."
      ),
      source_name: z.string().describe(
        "The fully qualified source reference for this attribute (e.g., if its name is temperature, then its source_name should be 'environment.environmentAttribute.temperature')."
      ),
    });

    const EnvironmentBehavior = z.object({
      name: z.string().describe("The name of the environment behavior."),
      description: z.string().describe(
        "A human-readable explanation of what this environment behavior does, without code. An environment behavior is a function that affects the environment or things related to the environment."
      ),
      inputs: z.array(FunctionInputParameter).optional().describe(
        "An array describing the inputs required by this environment behavior. Each entry must include a name, description, a type, and a source_name."
      ),
      outputs: z.array(FunctionOutputParameter).optional().describe(
        "An array describing the outputs produced by this behavior, with name, description, type, and a source_name."
      ),
      executionMode: ExecutionMode.describe(
        "Execution mode determines how this behavior is invoked: 'per-agent' (run once for each agent instance), 'model-once' (run once in the model context), or 'model-batch' (run once with access to batch collections such as all agents)."
      ),
      code: z.string().describe(
        "The complete function/method implementation in the codingLanguage. Should be a full function definition including signature, docstring, and body. For Python: 'def behavior_name(self):\\n    \"\"\"Docstring.\"\"\"\\n    # implementation'. Must reference only source_name of variables and functions."
      ),
      source_name: z.string().describe(
        "The fully qualified source reference for this behavior (e.g., if its name is updateTemperature, then the source_name should be 'environment.environmentBehavior.updateTemperature')."
      ),
    });

    const Environment = z.object({
      name: z.string().describe(
        "The name of the simulation environment. Describe the world or context (e.g., 'forest', 'grid world')."
      ),
      description: z.string().describe(
        "A plain-language explanation of what the environment represents in the model."
      ),
      topology: Topology.describe(
        "Defines the spatial or logical structure of the environment (none, grid, or network)."
      ),
      environmentAttributes: z.record(z.string(), EnvironmentAttribute).optional().describe(
        "A dictionary of world-level properties. Each attribute includes description, type, and an initial value or generator. An environment attribute is a property of the environment."
      ),
      environmentBehaviors: z.record(z.string(), EnvironmentBehavior).optional().describe(
        "A dictionary of functions that affect the environment itself. Each behavior acts at the environment level."
      ),
    });

    // ============================================================================
    // Agents Schema
    // ============================================================================

    const AgentAttribute = z.object({
      name: z.string().describe("The name of the agent behavior."),
      description: z.string().describe(
        "Explains what the agent attribute measures or represents for the agent. An agent attribute is a property of the agent."
      ),
      type: ParameterType.describe(
        "The data type of the agent attribute (integer, float, number, string, boolean, array, or object)."
      ),
      initialValue: ValueOrFunction.describe(
        "Initial value: can be a literal (5, 'hello', []), a framework attribute reference ('self.unique_id'), or a function call. Framework references are evaluated at runtime."
      ),
      source_name: z.string().describe(
        "The fully qualified source reference for this attribute (e.g., 'agent.Person.agentAttribute.health'). For example, if its name is health for an ant agent, then the source_name should be 'agent.ant.agentAttribute.health'."
      ),
    });

    const AgentBehavior = z.object({
      name: z.string().describe("The name of the agent behavior."),
      description: z.string().describe(
        "A human-readable explanation of what this agent behavior does, without code. An agent behavior is a function that affects the agent or things related to the agent."
      ),
      inputs: z.array(FunctionInputParameter).optional().describe(
        "An array describing inputs required by this behavior; each entry has a name (used in the function signature), description, type, and a source_name."
      ),
      outputs: z.array(FunctionOutputParameter).optional().describe(
        "An array describing outputs produced by this behavior; each entry has a name (used in the function signature), description, type, and a source_name."
      ),
      executionMode: ExecutionMode.describe(
        "Execution mode determines how this behavior is invoked: 'per-agent' (run once for each agent instance), 'model-once' (run once in the model context), or 'model-batch' (run once with access to batch collections such as all agents)."
      ),
      source_name: z.string().describe(
        "The fully qualified source reference for this behavior (e.g., 'agent.Person.agentBehavior.move'). If its name is walk for an ant agent, then the source_name should be 'agent.ant.agentBehavior.walk'."
      ),
      code: z.string().describe(
        "The complete method implementation in the codingLanguage. Should be a full method definition including signature, docstring, and body. For Python: 'def behavior_name(self):\\n    \"\"\"Docstring.\"\"\"\\n    # implementation'. Must reference only source_name of variables and functions."
      ),
    });

    const Agent = z.object({
      agentAttributes: z.record(z.string(), AgentAttribute).describe(
        "A dictionary of properties unique to this agent type. Each attribute has its own name, description, type, initial value, and source_name."
      ),
      initialCount: ValueOrFunction.describe(
        "The number of agents of this type at initialization. Can be: (1) an integer literal (e.g., 100), (2) a string reference to a variable (e.g., 'globalVariable.population'), or (3) generated by a function call."
      ),
      agentBehaviors: z.record(z.string(), AgentBehavior).optional().describe(
        "A dictionary of behaviors specific to this agent type. Each behavior is a function that affects the agent or things related to the agent."
      ),
    });

    // ============================================================================
    // Termination Criteria Schema
    // ============================================================================

    const TerminationRule = z.object({
      description: z.string().describe(
        "A plain-language explanation of what this termination rule monitors and why it ends the simulation."
      ),
      type: z.string().describe(
        "The data type of the end condition's value (integer, float, boolean, etc.)."
      ),
      value: ValueOrFunction.describe("The target value that triggers termination."),
    });

    const TerminationCriteria = z.object({
      terminationRules: z.record(z.string(), TerminationRule).optional().describe(
        "Dictionary of termination rules. Each key references a variable (e.g., 'globalVariable.population', 'environment.environmentAttribute.temperature'), and the simulation ends when that variable equals the specified value."
      ),
      maxSteps: z.number().int().positive().describe(
        "A fallback limit on the number of simulation steps. If no termination rule is met, the simulation stops when maxSteps is reached."
      ),
    });

    // ============================================================================
    // Scheduler Schema
    // ============================================================================

    const InitializationOrderItem = z.object({
      source_name: z.string().describe(
        "The fully qualified source_name for this item (e.g., 'globalVariable.population', 'agent.Person.initialCount'). This clarifies exactly what is being initialized."
      ),
      type: z.enum([
        "agentAttribute",
        "environmentAttribute",
        "globalVariable",
        "globalFunction",
        "initialCount",
      ]).describe(
        "The type of the item being initialized (agentAttribute, environmentAttribute, globalVariable, globalFunction, or an agent's initialCount)."
      ),
      orderInInitialization: z.number().int().positive().describe(
        "An integer indicating the position of this item in the initialization sequence (1=first, 2=second, etc.)."
      ),
    });

    const Initialization = z.object({
      description: z.string().describe(
        "Describes the steps taken during initialization (e.g., 'add this agent attribute to this agent type, set environment variables')."
      ),
      initializationOrder: z.array(InitializationOrderItem).describe(
        "An ordered list of items of agent attributes, environment attributes, global variables, and/or agent initialCount to initialize."
      ),
    });

    const ScheduleOrderItem = z.object({
      source_name: z.string().describe(
        "The fully qualified source_name for this item (e.g., 'agent.Person.agentBehavior.move', 'environment.environmentBehavior.updateTemperature', 'globalFunction.calculateStats'). This clarifies exactly what is being executed."
      ),
      type: z.enum(["agentBehavior", "environmentBehavior", "globalFunction"]).describe(
        "The type of item being run (agentBehavior, environmentBehavior, or globalFunction)."
      ),
      orderInSchedule: z.number().int().positive().describe(
        "An integer indicating the position of this item in the schedule sequence (1=first, 2=second, etc.)."
      ),
    });

    const Schedule = z.object({
      description: z.string().describe(
        "Describes the sequence of operations for each simulation step (tick) (e.g., which environment behaviors, agent behaviors, or global functions run first)."
      ),
      scheduleOrder: z.array(ScheduleOrderItem).describe(
        "An ordered list specifying which agent behaviors, environment behaviors, or global functions run in each simulation step."
      ),
    });

    const Scheduler = z.object({
      initialization: Initialization.describe(
        "The procedure that sets up global variables, environment attributes, agents, agent attributes, and agent initial counts before the simulation starts."
      ),
      schedule: Schedule.describe(
        "Controls the logic of what runs each time step in the simulation."
      ),
    });

    // ============================================================================
    // Outputs Schema
    // ============================================================================

    const TrackedVariable = z.object({
      description: z.string().describe(
        "A human-readable summary of why this variable is tracked and what insights it provides."
      ),
      source_name: z.string().describe(
        "The fully qualified source_name of the global variable, environmental attribute, or agent attribute being tracked (e.g., 'globalVariable.population', 'environment.environmentAttribute.temperature', 'agent.Person.agentAttribute.health')."
      ),
      collectionLevel: CollectionLevel.describe(
        "Specifies whether this variable is collected at the 'model' level (once per step, for global/environment variables) or 'agent' level (once per agent per step). Must match source_name pattern: 'globalVariable.*' and 'environment.*' require 'model', 'agent.*' requires 'agent'."
      ),
      check_time: z.enum(["start-of-step", "end-of-step"]).describe(
        "When during the simulation step to check/track this variable. 'start-of-step' records the value before any behaviors run, 'end-of-step' records the value after all behaviors complete."
      ),
    });

    const DataAnalytics = z.object({
      trackedVariables: z.array(TrackedVariable).optional().describe(
        "An array of objects specifying variables or metrics to record during the simulation run. It also specifies when during the simulation step to check/track this variable."
      ),
    });

    // ============================================================================
    // Library Configuration Schema
    // ============================================================================

    const LibraryConfiguration = z.object({
      name: z.string().describe(
        "The ABM library/framework to use for implementation. Library-specific code patterns (e.g., self.model in Mesa, agent.model in AgentPy) are allowed in code fields when a library is specified. popular libraries by language: python: mesa, agentpy, pyCX, simpy | julia: Agents.jl | r: NetLogoR | java: MASON, Repast | netlogo: NetLogo. Must be compatible with the specified codingLanguage."
      ),
      version: z.string().optional().describe(
        "Version of the ABM library (optional). Format examples: '3.x' (major version), '3.2' (minor version), '3.2.1' (patch version). Default: 'latest' - interpreted as the most recent version known to the LLM at generation time. Used by code generators/compilers to produce version-appropriate code patterns. For example, Mesa 2.x uses Agent(unique_id, model) while Mesa 3.x uses Agent(model). Specifying the version helps ensure generated code matches the target library version."
      ),
    });

    // ============================================================================
    // Main ABM Schema
    // ============================================================================

    const ABMJsonSchema = z.object({
      codingLanguage: z.string().describe(
        "The programming language used for writing all functions in this schema. This tells the model what syntax to generate (e.g., 'python', 'julia', 'r', 'java', 'netlogo')."
      ),
      abmLibrary: LibraryConfiguration.optional().describe(
        "Configuration for the ABM library/framework to use for implementation (optional). Specifies the library name and optionally its version. If omitted, only generic language code (without library-specific patterns) is expected.When specified, library-specific code patterns are allowed in code fields.The library must be compatible with the specified codingLanguage."
      ),
      globalFunctions: z.record(z.string(), GlobalFunction).optional().describe(
        "Section containing reusable helper functions that are not tied to agents or the environment. Use these to initialize or compute values across the simulation."
      ),
      globalVariables: z.record(z.string(), GlobalVariable).optional().describe(
        "Variables accessible from anywhere in the model. Each must include a description, type, source_name, and initialValue or function to generate the initial value."
      ),
      environment: Environment.describe(
        "Defines the overall world in which agents operate, including topology, environment-level attributes, and environment behaviors (functions that affect the environment itself)."
      ),
      agents: z.array(z.record(z.string(), Agent)).describe(
        "An array describing each type of agent in the simulation. Each agent type defines its own attributes, behaviors, and initial count."
      ),
      terminationCriteria: TerminationCriteria.describe(
        "Defines the conditions that terminate the simulation. Each key references a variable via source_name. The simulation ends when the condition is met. maxSteps serves as a fallback."
      ),
      scheduler: Scheduler.describe(
        "Controls the order and logic for initialization and the recurring schedule of agent and environment behavior execution."
      ),
      dataAnalytics: DataAnalytics.optional().describe(
        "Specifies which variables or metrics should be tracked and recorded for analysis."
      ),
      explanation: z.string().describe(LLMWrapper.SCHEMA_STRINGS.abmExplanation),
      title: z.string().describe(LLMWrapper.SCHEMA_STRINGS.title),
    });
    return ABMJsonSchema;
    }
  generateQuantitativeSDJSONResponseSchema(mentorMode) {
      const TypeEnum = z.enum(["stock", "flow", "variable"]).describe(LLMWrapper.SCHEMA_STRINGS.type);
      const PolarityEnum = z.enum(["+", "-"]).describe(LLMWrapper.SCHEMA_STRINGS.polarity);

      const GFPoint = z.object({
        x: z.number().describe(LLMWrapper.SCHEMA_STRINGS.gfPointX),
        y: z.number().describe(LLMWrapper.SCHEMA_STRINGS.gfPointY)
      }).describe(LLMWrapper.SCHEMA_STRINGS.gfPoint);

      const GF = z.object({
        points: z.array(GFPoint)
      }).describe(LLMWrapper.SCHEMA_STRINGS.gf);

      const Relationship = z.object({
          from: z.string().describe(LLMWrapper.SCHEMA_STRINGS.from),
          to: z.string().describe(LLMWrapper.SCHEMA_STRINGS.to),
          polarity: PolarityEnum,
          reasoning: z.string().describe(LLMWrapper.SCHEMA_STRINGS.reasoning),
          polarityReasoning: z.string().describe(LLMWrapper.SCHEMA_STRINGS.polarityReasoning)
      }).describe(LLMWrapper.SCHEMA_STRINGS.relationship);

      const Relationships = z.array(Relationship).describe(LLMWrapper.SCHEMA_STRINGS.relationships);

      const Variable = z.object({
        name: z.string().describe(LLMWrapper.SCHEMA_STRINGS.name),
        equation: z.string().describe(LLMWrapper.SCHEMA_STRINGS.equation),
        inflows: z.array(z.string()).optional().describe(LLMWrapper.SCHEMA_STRINGS.inflows),
        outflows: z.array(z.string()).optional().describe(LLMWrapper.SCHEMA_STRINGS.outflows),
        graphicalFunction: GF.optional().describe(LLMWrapper.SCHEMA_STRINGS.gfEquation),
        type: TypeEnum,
        documentation: z.string().describe(LLMWrapper.SCHEMA_STRINGS.documentation),
        units: z.string().describe(LLMWrapper.SCHEMA_STRINGS.units)
      });

      const Variables = z.array(Variable).describe(LLMWrapper.SCHEMA_STRINGS.variables);

      const SimSpecs = z.object({
        startTime: z.number().describe(LLMWrapper.SCHEMA_STRINGS.startTime),
        stopTime: z.number().describe(LLMWrapper.SCHEMA_STRINGS.stopTime),
        dt: z.number().describe(LLMWrapper.SCHEMA_STRINGS.dt),
        timeUnits: z.string().describe(LLMWrapper.SCHEMA_STRINGS.timeUnits)
      }).describe(LLMWrapper.SCHEMA_STRINGS.simSpecs);

      const Model = z.object({
        variables: Variables,
        relationships: Relationships,
        explanation: z.string().describe(mentorMode ? LLMWrapper.SCHEMA_STRINGS.mentorModeQuantExplanation: LLMWrapper.SCHEMA_STRINGS.quantExplanation),
        title: z.string().describe(LLMWrapper.SCHEMA_STRINGS.title),
        specs: SimSpecs
      });

      return Model;
  }

  async createChatCompletion(messages, model, zodSchema = null, temperature = null, reasoningEffort = null) {
    if (this.model.kind === ModelType.GEMINI) {
      return await this.#createGeminiChatCompletion(messages, model, zodSchema, temperature);
    } else if (this.model.kind === ModelType.CLAUDE) {
      return await this.#createClaudeChatCompletion(messages, model, zodSchema, temperature);
    }

    return await this.#createOpenAIChatCompletion(messages, model, zodSchema, temperature, reasoningEffort);
  }

  async #createOpenAIChatCompletion(messages, model, zodSchema = null, temperature = null, reasoningEffort = null) {
    const completionParams = {
      messages,
      model
    };

    if (zodSchema) {
      completionParams.response_format = zodResponseFormat(zodSchema, "sdai_schema");
    }

    if (temperature !== null && temperature !== undefined) {
      completionParams.temperature = temperature;
    }

    if (reasoningEffort) {
      completionParams.reasoning_effort = reasoningEffort;
    }

    const completion = await this.#openAIAPI.chat.completions.create(completionParams);
    return completion.choices[0].message;
  }

  async #createGeminiChatCompletion(messages, model, zodSchema = null, temperature = null) {
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);

    // Set up request config
    const requestConfig = {
      model: model,
      contents: geminiMessages.contents
    };

    // Add system instruction if present
    if (geminiMessages.systemInstruction) {
      requestConfig.systemInstruction = { parts: [{ text: geminiMessages.systemInstruction }] };
    }

    // Set up generation config
    const config = {};
    if (temperature !== null && temperature !== undefined) {
      config.temperature = temperature;
    }

    if (zodSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = this.#zodToStructuredOutputConverter.convert(zodSchema);
    }

    if (Object.keys(config).length > 0) {
      requestConfig.config = config;
    }

    const result = await this.#geminiAPI.models.generateContent(requestConfig);

    // Convert Gemini response to OpenAI format
    return {
      content: result.text
    };
  }

  async #createClaudeChatCompletion(messages, model, zodSchema = null, temperature = null) {
    const claudeMessages = this.convertMessagesToClaudeFormat(messages);

    const completionParams = {
      model,
      messages: claudeMessages.messages,
      max_tokens: 8192    
    };

    if (claudeMessages.system) {
      completionParams.system = claudeMessages.system;
    }

    if (temperature !== null && temperature !== undefined) {
      completionParams.temperature = temperature;
    }

    if (zodSchema) {
      completionParams.tools = [{
        name: "structured_output",
        description: "Output structured data according to the schema",
        input_schema: this.#zodToStructuredOutputConverter.convert(zodSchema)
      }];
      completionParams.tool_choice = { type: "tool", name: "structured_output" };
    }

    const completion = await this.#anthropicAPI.messages.create(completionParams);

    if (zodSchema && completion.content[0].type === 'tool_use') {
      return {
        content: JSON.stringify(completion.content[0].input)
      };
    }

    return {
      content: completion.content[0].text
    };
  }

  convertMessagesToGeminiFormat(messages) {
    const geminiMessages = {
      systemInstruction: null,
      contents: []
    };

    let systemMessageCount = 0;
    for (const message of messages) {
      if (!message.content)
        continue; //don't send empty messages, throws a 500 inside of gemini
      if (message.role === "system") {
        systemMessageCount++;
        if (systemMessageCount === 1) {
          // First system message becomes system instruction
          geminiMessages.systemInstruction = message.content;
        } else {
          // Second and subsequent system messages become user prompts
          geminiMessages.contents.push({
            role: "user",
            parts: [{ text: message.content }]
          });
        }
      } else if (message.role === "user") {
        geminiMessages.contents.push({
          role: "user",
          parts: [{ text: message.content }]
        });
      } else if (message.role === "assistant") {
        geminiMessages.contents.push({
          role: "model",
          parts: [{ text: message.content }]
        });
      }
    }

    return geminiMessages;
  }

  convertMessagesToClaudeFormat(messages) {
    const claudeMessages = {
      system: null,
      messages: []
    };

    let systemMessageCount = 0;
    for (const message of messages) {
      if (message.role === "system") {
        systemMessageCount++;
        if (systemMessageCount === 1) {
          // First system message becomes system instruction
          claudeMessages.system = message.content;
        } else {
          // Second and subsequent system messages become user prompts
          claudeMessages.messages.push({
            role: "user",
            content: message.content
          });
        }
      } else if (message.role === "user" || message.role === "assistant") {
        claudeMessages.messages.push({
          role: message.role,
          content: message.content
        });
      }
    }

    return claudeMessages;
  }

  static additionalParameters() {
    return [{
            name: "openAIKey",
            type: "string",
            required: false,
            uiElement: "password",
            saveForUser: "global",
            label: "Open AI API Key",
            description: "Leave blank for the default, or your Open AI key - skprojectXXXXX"
        },{
            name: "googleKey",
            type: "string",
            required: false,
            uiElement: "password",
            saveForUser: "global",
            label: "Google API Key",
            description: "Leave blank for the default, or your Google API key - XXXXXX"
        },{
            name: "anthropicKey",
            type: "string",
            required: false,
            uiElement: "password",
            saveForUser: "global",
            label: "Anthropic API Key",
            description: "Leave blank for the default, or your Anthropic API key - sk-ant-XXXXXX"
        },{
            name: "underlyingModel",
            type: "string",
            defaultValue: LLMWrapper.DEFAULT_MODEL,
            required: false,
            options: LLMWrapper.MODELS,
            uiElement: "combobox",
            saveForUser: "local",
            label: "LLM Model",
            description: "The LLM model that you want to use to process your queries."
        }];
    }
};
import AbmQuantBrain from './AbmQuantBrain.js'
import logger from '../../utilities/logger.js'
import { LLMWrapper } from '../../utilities/LLMWrapper.js';

class Engine {
    constructor() {

    }

    static supportedModes() {
        return ["abm"];
    }

    static description() {
        return 'ABM Quantitative Engine'
    }

    static link() {
        return "one day...";
    }

    additionalParameters()  { //inputs to program that are needed. json format
        return LLMWrapper.additionalParameters(); //parameters for the LLMwrapper. change llm enter api key. User level will be added. problem statement background knowledge...
    }

    async generate(prompt, currentModel, parameters) {
        try {
            let brain = new AbmQuantBrain(parameters); //interaction with llm. returns to schema. do not have yet.
            const response = await brain.generateModel(prompt, currentModel);
            let returnValue = {
                supportingInfo: {
                    explanation: response.explanation,
                    title: response.title
                },
                model: response.model
            };
            return returnValue;
        } catch(err) {
            logger.error(err);
            return { 
                err: err.toString() 
            };
        }
    }
}

export default Engine;
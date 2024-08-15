import prompts from "prompts";
import { ProjectType } from "../../../src";
import { Tokens } from "../../../src/enums";
import { validateEmptyValue } from "../common";
import { SuperTokenInfo, TokenRateLimits } from "./main";
import { getInitialLimitValue } from "./utils";

export const getHookRelatedInfo = async (
  projectType: ProjectType,
  isLimitsRequired: boolean,
  tokens: Tokens[],
  superTokenInfoMap: Record<string, SuperTokenInfo> = {}
) => {
  let tokenLimitInfo: TokenRateLimits = {};
  if (isLimitsRequired) {
    for (let token of tokens) {
      const initialValue = await getInitialLimitValue(
        projectType,
        token,
        superTokenInfoMap
      );
      // console.log("initialValue", initialValue, tokens);
      // console.log(initialValue.sendingLimit, initialValue.receivingLimit);
      let limitInfo = await prompts([
        {
          name: "sendingLimit",
          type: "text",
          message: `Enter max daily sending limit for ${token} (Enter formatted values, 100.0 for 100 USDC. Check README for more info):`,
          validate: (value) => validateEmptyValue(String(value).trim()),
          initial: String(initialValue.sendingLimit),
        },
        {
          name: "receivingLimit",
          type: "text",
          message: `Enter max daily receiving limit for ${token} (Enter formatted values, 100.0 for 100 USDC Check README for more info):`,
          validate: (value) => validateEmptyValue(String(value).trim()),
          initial: String(initialValue.receivingLimit),
        },
      ]);

      tokenLimitInfo[token] = limitInfo;
    }
  }
  return { tokenLimitInfo };
};

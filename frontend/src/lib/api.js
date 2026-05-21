export const mutationIntentHeaderName = "X-Suno-Intent";
export const mutationIntentHeaderValue = "ui";

export function withMutationIntent(headers = {}) {
  return {
    ...headers,
    [mutationIntentHeaderName]: mutationIntentHeaderValue
  };
}

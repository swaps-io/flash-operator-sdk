import { AxiosInstance } from 'axios';

import {
  AxiosClient,
  AxiosInstanceSource,
  assertAxiosInstanceAssign,
  assertAxiosInstanceSet,
  createAxiosInstance,
} from 'flash-sdk';

const TARGET_NAME = 'operator main API (v0)';

let axiosInstance: AxiosInstance | undefined;
let instanceSource: AxiosInstanceSource | undefined;

export const setAxiosInstanceMainV0 = (source: AxiosInstanceSource): void => {
  if (assertAxiosInstanceAssign(axiosInstance, instanceSource, source, TARGET_NAME)) {
    axiosInstance = createAxiosInstance(source);
    instanceSource = source;
  }
};

export const axiosClientMainV0: AxiosClient = (config, options) => {
  assertAxiosInstanceSet(axiosInstance, TARGET_NAME);
  return axiosInstance.request({ ...config, ...options });
};

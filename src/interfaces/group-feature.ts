import { GroupFeature } from "../enums";

export interface GroupFeatureState {
  featureKey: GroupFeature;
  isEnabled: boolean;
  updatedAt?: string;
  updatedByUserId?: number;
}

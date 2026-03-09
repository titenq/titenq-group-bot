import { GroupFeature } from "../enums/group-feature";

export interface GroupFeatureState {
  featureKey: GroupFeature;
  isEnabled: boolean;
  updatedAt?: string;
  updatedByUserId?: number;
}

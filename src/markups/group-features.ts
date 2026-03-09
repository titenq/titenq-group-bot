import { TFunction } from "i18next";
import { InlineKeyboardMarkup } from "telegraf/types";

import { GroupFeatureState } from "../interfaces/group-feature";

export const groupFeaturesMarkup = (
  t: TFunction,
  features: GroupFeatureState[],
): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      ...features.reduce<InlineKeyboardMarkup["inline_keyboard"]>(
        (rows, feature, index) => {
          const statusIcon = feature.isEnabled ? "✅" : "⛔";

          const statusLabel = feature.isEnabled
            ? t("commands.features_status_on")
            : t("commands.features_status_off");
          
          const featureLabel = t(
            `commands.features_feature_${feature.featureKey}`,
          );
          
          const button = {
            text: `${featureLabel} ${statusIcon} ${statusLabel}`,
            callback_data: `features_toggle_${feature.featureKey}`,
          };

          if (index % 2 === 0) {
            rows.push([button]);
          } else {
            rows[rows.length - 1].push(button);
          }

          return rows;
        },
        [],
      ),
      [
        {
          text: t("commands.features_delete_panel"),
          callback_data: "features_delete_panel",
        },
      ],
    ],
  },
});

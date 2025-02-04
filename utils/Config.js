import PogObject from "PogData"

export const config = new PogObject("PricingChecker", {
    useFastSell: false,
    debugMode: false,
    roundNumbers: true,
}, "config/Config.json");

config.autosave(5);
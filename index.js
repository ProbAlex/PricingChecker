import { request } from "axios";
import { editSign } from "./utils/Sign"
import { config } from "./utils/Config";
import { checkPrice } from "./utils/Keybinds";
let { useFastSell, debugMode, roundNumbers } = config;


checkPrice.registerKeyPress(() => {
    const item = Player.getHeldItem();
    if (!item) {
        ChatLib.chat('§3PricingChecker: §cNo item found');
        return;
    }
    handleItem(item);
})

register('guiKey', (_, char2) => {
    if (char2 !== checkPrice.getKeyCode()) return;
    try {
        if (Client.currentGui.getClassName() == 'GuiEditSign') {
            const inv = Player.getContainer();
            if (!inv.getName().includes('Create') || !inv.getName().includes('Auction')) return;//Wow I'm amazing at coding
            const slot = inv.getStackInSlot(13);
            if (!slot || slot.getName().includes("Click an item in your inventory!")) {
                ChatLib.chat(`§3PricingChecker:§c No item found in your auction slot!`);
                return;
            }
            handleItem(slot);
        } else {
            const slot = Client.currentGui?.getSlotUnderMouse()?.getItem();
            if (!slot) return;
            handleItem(slot);
            return;
        }
    } catch (e) {
        console.error(e);
        ChatLib.chat(`Error checking price!!! `);
    }
})

function handleItem(slot) {
    let nbt = slot.getNBT().toObject();
    let name = nbt.tag.display.Name;
    if (name.includes('AUCTION FOR ITEM')) name = nbt.tag.display.Lore[1];
    ChatLib.chat(`§3PricingChecker:§e Fetching price for ${name}`);
    let recentItemData = JSON.stringify(nbt);//Trust me JSON.stringify and then JSON.parse is better than just .toOject
    fetchPriceData(recentItemData)
        .then(handlePrices)
        .catch(e => {
            if (typeof e == 'object') e = JSON.stringify(e);
            console.log('Api error', e);
            ChatLib.chat('§3PricingChecker: §cError fetching price! (Make sure this item is auctionable)');
        });
}

function fetchPriceData(itemData) {
    debug(`Item data: ${itemData}`);
    itemData = JSON.parse(itemData);
    return request({
        url: 'https://sky.coflnet.com/api/price/nbt',
        method: 'POST',
        headers: {
            'accept': 'text/plain',
            'Content-Type': 'application/json-patch+json',
            'User-Agent': `CT price checker`
        },
        body: {
            jsonNbt: JSON.stringify([itemData])
        }
    })
}

function Price(median, volume, lbin, fastsell) {
    if (useFastSell) return fastsell;
    debug(`Starting pricing with lbin: ${lbin}, median: ${median}, volume: ${volume}`);
    if (median < lbin) {
        if (volume <= 3) {
            debug('Low volume, returning median');
            return (median);
        } else {
            const difference = lbin - median;
            let savedVolume = volume;
            volume = volume / (volume - 1.5);
            volume = 2 - volume;
            debug(`Ok it's the actual alg now, volume: ${savedVolume}, new volume: ${volume}, difference ${difference}`)
            return (median + (difference * volume));
        }
    } else if (lbin * 2 < median) {
        debug('Super low LBIN detected, returning median - 1');
        return (median - 1);
    } else {
        debug('LBIN is decently priced and under median, returning lbin - 1');
        return (lbin - 1);
    }
}

function handlePrices(data) {
    if (!data.data[0]) throw new Error(`ahhhhh no data on item!!! was given ${JSON.stringify(data)}`);
    const { lbin, median, fastSell, volume } = data.data[0];
    debug(`§3PricingChecker:\n§f${JSON.stringify(data.data)}`);
    let suggestedPrice = Price(median, volume, lbin, fastSell);
    if (roundNumbers) suggestedPrice = roundNumber(suggestedPrice);
    assignPrice(suggestedPrice);
}

function assignPrice(value) {
    if (Client.currentGui.getClassName() == 'GuiEditSign') {
        ChatLib.chat(`§3PricingChecker: Set price to §6${addCommasToNumber(value)} coins!`);
        editSign(value);
    } else {
        ChatLib.chat(`§3PricingChecker: Item is worth §6${addCommasToNumber(value)} coins!`);
    }
}

function addCommasToNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function roundNumber(number) {
    const roundingFactor = Math.pow(10, 5);//5 = 6th digit - 1 aka like the 100,000 spot yk
    return Math.round(number / roundingFactor) * roundingFactor;
}

function debug(msg) {
    if (!debugMode) return;
    console.log(msg);
    ChatLib.chat(msg);
}

register('command', (command, value) => {
    command = command?.toLowerCase();
    value = value ? value.toLowerCase() === 'true' : null;
    switch (command) {
        case "debug": {
            if (value) config.debugMode = value;
            else config.debugMode = !debugMode;
            ChatLib.chat(`§3Pricing Helper: ok haha ${config.debugMode}`);
            break;
        }
        case "quicksell":
        case "fastsell": {
            if (value) config.useFastSell = value;
            else config.useFastSell = !useFastSell;
            ChatLib.chat(`§3Pricing Helper: Prices will ${config.useFastSell ? "now be" : "no longer be"} lower so that items sell instantly`);
            break;
        }
        case "roundnumbers":
        case "roundnumber":
        case "roundnum"://I think an if statement would have been better like maybe if(command.includes('round')) command = 'round' cause then I can still use my fun switch statement but too late now
        case "round": {
            if (value) config.roundNumbers = value;
            else config.roundNumbers = !roundNumbers;
            ChatLib.chat(`§3Pricing Helper: Prices will ${config.roundNumbers ? "now be" : "no longer be"} rounded`);
            break;
        }
        case "config": {
            ChatLib.chat(`§3Pricing Helper:§f ${JSON.stringify(config)}`);
            break;
        }
        case "bids": {
            ChatLib.command("ah")
        }
        default:
            const item = Player.getHeldItem();
            if (!item) {
                ChatLib.chat('§3PricingChecker: §cNo item found');
                return;
            }
            handleItem(item);
            break;
    }

    loadConfig();
}).setName('pricing').setAliases('PricingChecker', 'pricecheck','price','god')
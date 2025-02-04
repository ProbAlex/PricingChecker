const ChatComponentText = Java.type("net.minecraft.util.ChatComponentText")

export function editSign(string) {
    const tileSign = Client.currentGui.get().class.getDeclaredField("field_146848_f")
    tileSign.setAccessible(true)

    tileSign.get(Client.currentGui.get()).field_145915_a[0] = new ChatComponentText(string)

    Client.getMinecraft().func_147108_a(null)
}
// The WhatsApp shop add-on: is it switched on for this store?
//
// Free for every store for now. When the add-on gets a price, this is the
// one place to change (e.g. check an active add-on subscription); the
// dashboard, the connect flows and the bot all ask here.
export async function whatsappAddonActive(_storeId: string): Promise<boolean> {
  return true;
}

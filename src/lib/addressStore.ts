// Saved addresses store (Amazon-style address book)

export interface SavedAddress {
  id: string;
  label: string; // e.g. "Office", "Warehouse"
  address: string; // free text
  spaceId?: string; // optional Space ID provided by the user
}

let savedAddresses: SavedAddress[] = [];
let nextAddrId = 1;

export function generateAddressId(): string {
  return `ADDR-${String(nextAddrId++).padStart(4, "0")}`;
}

export function addSavedAddress(address: string, label?: string, spaceId?: string): SavedAddress {
  const id = generateAddressId();
  const entry: SavedAddress = {
    id,
    label: label || `Address ${savedAddresses.length + 1}`,
    address,
    spaceId: spaceId?.trim() || undefined,
  };
  savedAddresses = [...savedAddresses, entry];
  return entry;
}

export function getSavedAddresses(): SavedAddress[] {
  return savedAddresses;
}

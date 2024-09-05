export const isValidEip1271Signature = async (
  rpcUrls,
  address,
  hash,
  signature
) => {
  return (
    address === '0x7F30B1960D5556929B03a0339814fE903c55a347' &&
    hash === '0x1' &&
    signature === '0x222'
  );
};

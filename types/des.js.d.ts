declare module "des.js" {
  type CipherOptions = {
    type: "encrypt" | "decrypt";
    key: Uint8Array;
    padding?: boolean;
  };

  interface Cipher {
    update(data: Uint8Array): number[];
    final(data?: Uint8Array): number[];
  }

  interface CipherFactory {
    create(options: CipherOptions): Cipher;
  }

  const des: {
    DES: CipherFactory;
    CBC: CipherFactory;
    EDE: CipherFactory;
    Cipher: unknown;
    utils: unknown;
  };

  export = des;
}

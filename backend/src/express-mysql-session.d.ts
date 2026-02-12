declare module "express-mysql-session" {
  import type { Store } from "express-session";
  type Session = { Store: new () => Store };
  type Options = {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    createDatabaseTable?: boolean;
    expiration?: number;
    clearExpired?: boolean;
    checkExpirationInterval?: number;
  };
  type StoreClass = new (options: Options) => Store;
  function MySQLStore(session: Session): StoreClass;
  export = MySQLStore;
}

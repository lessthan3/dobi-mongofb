import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import * as _utils from './utils';

export const utils = _utils;
export { default as Collection } from './Collection';
export { default as CollectionRef } from './CollectionRef';
export { default as Database } from './Database';
export { default as Document } from './Document';
export { default as DocumentRef } from './DocumentRef';
export { default as EventEmitter } from './EventEmitter';
export { default as PseudoCollection } from './PseudoCollection';
export { firebase };

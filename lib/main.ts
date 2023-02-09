import { IndexedDBStoreOptions } from './types'
import type { Quad, Term } from 'n3'
import { digest } from './helpers/digest'
import { wrap } from 'asynciterator'

export class IndexedDBStore {

  #options: IndexedDBStoreOptions
  #db?: IDBDatabase

  constructor (options: IndexedDBStoreOptions) {
    this.#options = options
  }

  install () {
    const request = window.indexedDB.open(this.#options.name, 1);

    return new Promise((resolve, reject) => {
      request.onerror = reject

      request.onupgradeneeded = (event) => {
        this.#db = (event.target as IDBOpenDBRequest).result
      
        const store = this.#db.createObjectStore('quads')
        store.createIndex('subject', '', { unique: false })
        store.createIndex('predicate', '', { unique: false })
        store.createIndex('object', '', { unique: false })
        store.createIndex('graph', '', { unique: false })
      }

      request.onsuccess = (event) => {
        this.#db = (event.target as IDBOpenDBRequest).result
        resolve(this)
      }
    })
  }

  async add (quad: Quad) {
    const exists = await this.has(quad)
    if (exists) return

    const id = await digest(quad.toJSON())
    await this.transact((store) => store.add(quad.toJSON(), id))
  }

  async delete (quad: Quad) {
    const id = await digest(quad.toJSON())
    await this.transact((store) => store.delete(id))
  }

  async has (quad: Quad) {
    const id = await digest(quad.toJSON())
    const response = await this.transact((store) => store.get(id)) as IDBRequest<any>
    return response.result
  }

  match (subject?: Term, predicate?: Term, object?: Term, graph?: Term) {
    const matches: Array<Quad> = []

    const promise = new Promise(async (resolve, reject) => {
      this.transact((store) => {
        const request = store.openCursor()
        request.onsuccess = (event) => {
          const cursor = (event.target as any).result
          if (cursor) {
            const quad = cursor.value

            if (
              (subject ? subject.equals(quad.subject) : true) &&
              (predicate ? predicate.equals(quad.predicate) : true) &&
              (object ? object.equals(quad.object) : true) &&
              (graph ? graph.equals(quad.graph) : true)) 
            {
              matches.push(quad)
            }

            cursor.continue()
          }
          else {
            resolve(matches)
          }
        }  
      })  
    }) as Promise<Array<Quad>>

    return wrap<Quad>(promise)
  }

  transact (callback: (store: IDBObjectStore) => any) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db!.transaction(['quads'], 'readwrite')
      transaction.onerror = reject
      let response: any = null
      transaction.oncomplete = () => resolve(response)
      const store = transaction.objectStore('quads')  
      response = callback(store)
    })
  }
}
import { Quad, DataFactory } from 'n3'
import { IndexedDBStore } from '../lib/main'
const { namedNode, literal } = DataFactory

const store = new IndexedDBStore({ name: 'example' })

await store.install()

await store.add(new Quad(
  namedNode('https://example.com/test'),
  namedNode('https://example.com/predicate'),
  literal('Lorem Ipsum')
))

await store.add(new Quad(
  namedNode('https://example.com/test'),
  namedNode('https://example.com/predicate'),
  literal('Lorem Ipsum1')
))

// await store.delete(new Quad(
//   namedNode('https://example.com/test'),
//   namedNode('https://example.com/predicate'),
//   literal('Lorem Ipsum')
// ))

// await store.delete(new Quad(
//   namedNode('https://example.com/test'),
//   namedNode('https://example.com/predicate'),
//   literal('Lorem Ipsum1')
// ))

// const response = store.match(namedNode('https://example.com/test'))
// const quads = await response.toArray()
// console.log(quads)

/** @ts-ignore */
new Comunica.QueryEngine().queryBindings(`
  SELECT * { ?s ?p ?o }
`, {
  sources: [store],
}).then(function (bindingsStream: any) {
  bindingsStream.on('data', function (data: any) {
    console.log(data.get('s').value + ' ' + data.get('p').value + ' ' + data.get('o').value);
  });
});
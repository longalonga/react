/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let ReactFeatureFlags = require('shared/ReactFeatureFlags');
ReactFeatureFlags.enableNewContextAPI = true;

let React = require('react');
let ReactNoop;
let gen;

describe('ReactNewContext', () => {
  beforeEach(() => {
    jest.resetModules();
    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.debugRenderPhaseSideEffectsForStrictMode = false;
    ReactFeatureFlags.enableNewContextAPI = true;
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    gen = require('random-seed');
  });

  // function div(...children) {
  //   children = children.map(c => (typeof c === 'string' ? {text: c} : c));
  //   return {type: 'div', children, prop: undefined};
  // }

  function span(prop) {
    return {type: 'span', children: [], prop};
  }

  it('simple mount and update', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      return Context.provide(props.value, props.children);
    }

    function Consumer(props) {
      return Context.consume(value => {
        return <span prop={'Result: ' + value} />;
      });
    }

    const Indirection = React.Fragment;

    function App(props) {
      return (
        <Provider value={props.value}>
          <Indirection>
            <Indirection>
              <Consumer />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={2} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([span('Result: 2')]);

    // Update
    ReactNoop.render(<App value={3} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([span('Result: 3')]);
  });

  it('propagates through shouldComponentUpdate false', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      ReactNoop.yield('Provider');
      return Context.provide(props.value, props.children);
    }

    function Consumer(props) {
      ReactNoop.yield('Consumer');
      return Context.consume(value => {
        ReactNoop.yield('Consumer render prop');
        return <span prop={'Result: ' + value} />;
      });
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        ReactNoop.yield('Indirection');
        return this.props.children;
      }
    }

    function App(props) {
      ReactNoop.yield('App');
      return (
        <Provider value={props.value}>
          <Indirection>
            <Indirection>
              <Consumer />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={2} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      'Indirection',
      'Indirection',
      'Consumer',
      'Consumer render prop',
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: 2')]);

    // Update
    ReactNoop.render(<App value={3} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      'Consumer render prop',
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: 3')]);
  });

  it('consumers bail out if context value is the same', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      ReactNoop.yield('Provider');
      return Context.provide(props.value, props.children);
    }

    function Consumer(props) {
      ReactNoop.yield('Consumer');
      return Context.consume(value => {
        ReactNoop.yield('Consumer render prop');
        return <span prop={'Result: ' + value} />;
      });
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        ReactNoop.yield('Indirection');
        return this.props.children;
      }
    }

    function App(props) {
      ReactNoop.yield('App');
      return (
        <Provider value={props.value}>
          <Indirection>
            <Indirection>
              <Consumer />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={2} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      'Indirection',
      'Indirection',
      'Consumer',
      'Consumer render prop',
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: 2')]);

    // Update with the same context value
    ReactNoop.render(<App value={2} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      // Don't call render prop again
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: 2')]);
  });

  it('nested providers', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      return Context.consume(contextValue =>
        // Multiply previous context value by 2, unless prop overrides
        Context.provide(props.value || contextValue * 2, props.children),
      );
    }

    function Consumer(props) {
      return Context.consume(value => {
        return <span prop={'Result: ' + value} />;
      });
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return this.props.children;
      }
    }

    function App(props) {
      return (
        <Provider value={props.value}>
          <Indirection>
            <Provider>
              <Indirection>
                <Provider>
                  <Indirection>
                    <Consumer />
                  </Indirection>
                </Provider>
              </Indirection>
            </Provider>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={2} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([span('Result: 8')]);

    // Update
    ReactNoop.render(<App value={3} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([span('Result: 12')]);
  });

  it('multiple consumers in different branches', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      return Context.consume(contextValue =>
        // Multiply previous context value by 2, unless prop overrides
        Context.provide(props.value || contextValue * 2, props.children),
      );
    }

    function Consumer(props) {
      return Context.consume(value => {
        return <span prop={'Result: ' + value} />;
      });
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return this.props.children;
      }
    }

    function App(props) {
      return (
        <Provider value={props.value}>
          <Indirection>
            <Indirection>
              <Provider>
                <Consumer />
              </Provider>
            </Indirection>
            <Indirection>
              <Consumer />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={2} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([
      span('Result: 4'),
      span('Result: 2'),
    ]);

    // Update
    ReactNoop.render(<App value={3} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([
      span('Result: 6'),
      span('Result: 3'),
    ]);

    // Another update
    ReactNoop.render(<App value={4} />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([
      span('Result: 8'),
      span('Result: 4'),
    ]);
  });

  it('compares context values with Object.is semantics', () => {
    const Context = React.unstable_createContext(1);

    function Provider(props) {
      ReactNoop.yield('Provider');
      return Context.provide(props.value, props.children);
    }

    function Consumer(props) {
      ReactNoop.yield('Consumer');
      return Context.consume(value => {
        ReactNoop.yield('Consumer render prop');
        return <span prop={'Result: ' + value} />;
      });
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        ReactNoop.yield('Indirection');
        return this.props.children;
      }
    }

    function App(props) {
      ReactNoop.yield('App');
      return (
        <Provider value={props.value}>
          <Indirection>
            <Indirection>
              <Consumer />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App value={NaN} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      'Indirection',
      'Indirection',
      'Consumer',
      'Consumer render prop',
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: NaN')]);

    // Update
    ReactNoop.render(<App value={NaN} />);
    expect(ReactNoop.flush()).toEqual([
      'App',
      'Provider',
      // Consumer should not re-render again
      // 'Consumer render prop',
    ]);
    expect(ReactNoop.getChildren()).toEqual([span('Result: NaN')]);
  });

  it('context unwinds when interrupted', () => {
    const Context = React.unstable_createContext('Default');

    function Provider(props) {
      return Context.provide(props.value, props.children);
    }

    function Consumer(props) {
      return Context.consume(value => {
        return <span prop={'Result: ' + value} />;
      });
    }

    function BadRender() {
      throw new Error('Bad render');
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return null;
        }
        return this.props.children;
      }
    }

    function App(props) {
      return (
        <React.Fragment>
          <Provider value="Does not unwind">
            <ErrorBoundary>
              <Provider value="Unwinds after BadRender throws">
                <BadRender />
              </Provider>
            </ErrorBoundary>
            <Consumer />
          </Provider>
        </React.Fragment>
      );
    }

    ReactNoop.render(<App value="A" />);
    ReactNoop.flush();
    expect(ReactNoop.getChildren()).toEqual([
      // The second provider should use the default value. This proves the
      span('Result: Does not unwind'),
    ]);
  });

  it('can skip consumers with bitmask', () => {
    const Context = React.unstable_createContext({foo: 0, bar: 0}, (a, b) => {
      let result = 0;
      if (a.foo !== b.foo) {
        result |= 0b01;
      }
      if (a.bar !== b.bar) {
        result |= 0b10;
      }
      return result;
    });

    function Provider(props) {
      return Context.provide({foo: props.foo, bar: props.bar}, props.children);
    }

    function Foo() {
      return Context.consume(value => {
        ReactNoop.yield('Foo');
        return <span prop={'Foo: ' + value.foo} />;
      }, 0b01);
    }

    function Bar() {
      return Context.consume(value => {
        ReactNoop.yield('Bar');
        return <span prop={'Bar: ' + value.bar} />;
      }, 0b10);
    }

    class Indirection extends React.Component {
      shouldComponentUpdate() {
        return false;
      }
      render() {
        return this.props.children;
      }
    }

    function App(props) {
      return (
        <Provider foo={props.foo} bar={props.bar}>
          <Indirection>
            <Indirection>
              <Foo />
            </Indirection>
            <Indirection>
              <Bar />
            </Indirection>
          </Indirection>
        </Provider>
      );
    }

    ReactNoop.render(<App foo={1} bar={1} />);
    expect(ReactNoop.flush()).toEqual(['Foo', 'Bar']);
    expect(ReactNoop.getChildren()).toEqual([span('Foo: 1'), span('Bar: 1')]);

    // Update only foo
    ReactNoop.render(<App foo={2} bar={1} />);
    expect(ReactNoop.flush()).toEqual(['Foo']);
    expect(ReactNoop.getChildren()).toEqual([span('Foo: 2'), span('Bar: 1')]);

    // Update only bar
    ReactNoop.render(<App foo={2} bar={2} />);
    expect(ReactNoop.flush()).toEqual(['Bar']);
    expect(ReactNoop.getChildren()).toEqual([span('Foo: 2'), span('Bar: 2')]);

    // Update both
    ReactNoop.render(<App foo={3} bar={3} />);
    expect(ReactNoop.flush()).toEqual(['Foo', 'Bar']);
    expect(ReactNoop.getChildren()).toEqual([span('Foo: 3'), span('Bar: 3')]);
  });

  it('warns if calculateChangedBits returns larger than a 31-bit integer', () => {
    spyOnDev(console, 'error');

    const Context = React.unstable_createContext(
      0,
      (a, b) => Math.pow(2, 32) - 1, // Return 32 bit int
    );

    function Provider(props) {
      return Context.provide(props.value, props.children);
    }

    ReactNoop.render(<Provider value={1} />);
    ReactNoop.flush();

    // Update
    ReactNoop.render(<Provider value={2} />);
    ReactNoop.flush();

    if (__DEV__) {
      expect(console.error.calls.count()).toBe(1);
      expect(console.error.calls.argsFor(0)[0]).toContain(
        'calculateChangedBits: Expected the return value to be a 31-bit ' +
          'integer. Instead received: 4294967295',
      );
    }
  });

  it('warns if multiple renderers concurrently render the same context', () => {
    spyOnDev(console, 'error');
    const Context = React.unstable_createContext(0);

    function Foo(props) {
      ReactNoop.yield('Foo');
      return null;
    }
    function Provider(props) {
      return Context.provide(props.value, props.children);
    }

    function App(props) {
      return (
        <Provider value={props.value}>
          <Foo />
          <Foo />
        </Provider>
      );
    }

    ReactNoop.render(<App value={1} />);
    // Render past the Provider, but don't commit yet
    ReactNoop.flushThrough(['Foo']);

    // Get a new copy of ReactNoop
    jest.resetModules();
    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableNewContextAPI = true;
    React = require('react');
    ReactNoop = require('react-noop-renderer');

    // Render the provider again using a different renderer
    ReactNoop.render(<App value={1} />);
    ReactNoop.flush();

    if (__DEV__) {
      expect(console.error.calls.argsFor(0)[0]).toContain(
        'Detected multiple renderers concurrently rendering the same ' +
          'context provider. This is currently unsupported',
      );
    }
  });

  describe('fuzz test', () => {
    const Fragment = React.Fragment;
    const contextKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    const FLUSH_ALL = 'FLUSH_ALL';
    function flushAll() {
      return {
        type: FLUSH_ALL,
        toString() {
          return `flushAll()`;
        },
      };
    }

    const FLUSH = 'FLUSH';
    function flush(unitsOfWork) {
      return {
        type: FLUSH,
        unitsOfWork,
        toString() {
          return `flush(${unitsOfWork})`;
        },
      };
    }

    const UPDATE = 'UPDATE';
    function update(key, value) {
      return {
        type: UPDATE,
        key,
        value,
        toString() {
          return `update('${key}', ${value})`;
        },
      };
    }

    function randomInteger(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function randomAction() {
      switch (randomInteger(0, 3)) {
        case 0:
          return flushAll();
        case 1:
          return flush(randomInteger(0, 500));
        case 2:
          const key = contextKeys[randomInteger(0, contextKeys.length)];
          const value = randomInteger(1, 10);
          return update(key, value);
        default:
          throw new Error('Switch statement should be exhaustive');
      }
    }

    function randomActions(n) {
      let actions = [];
      for (let i = 0; i < n; i++) {
        actions.push(randomAction());
      }
      return actions;
    }

    function ContextSimulator(maxDepth) {
      const contexts = new Map(
        contextKeys.map(key => {
          const Context = React.unstable_createContext(0);
          Context.displayName = 'Context' + key;
          return [key, Context];
        }),
      );

      class ConsumerTree extends React.Component {
        shouldComponentUpdate() {
          return false;
        }
        render() {
          if (this.props.depth >= this.props.maxDepth) {
            return null;
          }
          const consumers = [0, 1, 2].map(i => {
            const randomKey =
              contextKeys[
                this.props.rand.intBetween(0, contextKeys.length - 1)
              ];
            const Context = contexts.get(randomKey);
            return Context.consume(
              value => (
                <Fragment>
                  <span prop={`${randomKey}:${value}`} />
                  <ConsumerTree
                    rand={this.props.rand}
                    depth={this.props.depth + 1}
                    maxDepth={this.props.maxDepth}
                  />
                </Fragment>
              ),
              null,
              i,
            );
          });
          return consumers;
        }
      }

      function Root(props) {
        return contextKeys.reduceRight((children, key) => {
          const Context = contexts.get(key);
          const value = props.values[key];
          return Context.provide(value, children);
        }, <ConsumerTree rand={props.rand} depth={0} maxDepth={props.maxDepth} />);
      }

      const initialValues = contextKeys.reduce(
        (result, key, i) => ({...result, [key]: i + 1}),
        {},
      );

      function assertConsistentTree(expectedValues = {}) {
        const children = ReactNoop.getChildren();
        children.forEach(child => {
          const text = child.prop;
          const key = text[0];
          const value = parseInt(text[2], 10);
          const expectedValue = expectedValues[key];
          if (expectedValue === undefined) {
            // If an expected value was not explicitly passed to this function,
            // use the first occurrence.
            expectedValues[key] = value;
          } else if (value !== expectedValue) {
            throw new Error(
              `Inconsistent value! Expected: ${key}:${expectedValue}. Actual: ${
                text
              }`,
            );
          }
        });
      }

      function simulate(seed, actions) {
        const rand = gen.create(seed);
        let finalExpectedValues = initialValues;
        function updateRoot() {
          ReactNoop.render(
            <Root
              maxDepth={maxDepth}
              rand={rand}
              values={finalExpectedValues}
            />,
          );
        }
        updateRoot();

        actions.forEach(action => {
          switch (action.type) {
            case FLUSH_ALL:
              ReactNoop.flush();
              break;
            case FLUSH:
              ReactNoop.flushUnitsOfWork(action.unitsOfWork);
              break;
            case UPDATE:
              finalExpectedValues = {
                ...finalExpectedValues,
                [action.key]: action.value,
              };
              updateRoot();
              break;
            default:
              throw new Error('Switch statement should be exhaustive');
          }
          assertConsistentTree();
        });

        ReactNoop.flush();
        assertConsistentTree(finalExpectedValues);
      }

      return {simulate};
    }

    it('hard-coded tests', () => {
      const {simulate} = ContextSimulator(5);
      simulate('randomSeed', [flush(3), update('A', 4)]);
    });

    it('generated tests', () => {
      const {simulate} = ContextSimulator(5);

      const LIMIT = 100;
      for (let i = 0; i < LIMIT; i++) {
        const seed = Math.random()
          .toString(36)
          .substr(2, 5);
        const actions = randomActions(5);
        try {
          simulate(seed, actions);
        } catch (error) {
          console.error(`
Context fuzz tester error! Copy and paste the following line into the test suite:
  simulate('${seed}', ${actions.join(', ')});
`);
          throw error;
        }
      }
    });
  });
});

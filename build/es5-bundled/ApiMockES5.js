"use strict";

/*
This is a global publish/subscribe channel object definition.
It was introduced to allow for a communication between various parties in stores using various widget technologies and AllexisSDK as well.
It is supposed to be independent, not a part of a component (even though in this POC it is in the same repository).
Idea is inspired from Backbone's `Radio` object (aka `Channel`).

Even though, for a react-like components, a state machine like Redux would be more convenient solution,
Pub/sub mechanism like this has advantages in:
- being much smaller that Redux\
- being easily accessible from any technology, as it is Vanilla and bases on callbacks
- doesn't require to move state from AllexisSDK or old widgets to a new state container (as it only allow for communication, and doesn't preserve any state itself)

Disadvantages:
- no single source of truth
- to unsubscribe, component classes need to preserve a reference to a callback function
- because often it will be a class method, the easiest way I've figured out is to pass `this` and use it as a scope for further callback call
- the above ones make it less convenient and not leveraging React to full extend, as Redux would

There's a lot of room for improvements, though:
- Improving the managment of a scope of callbacks
- Additional methods may be needed later on, to i.e. reset an event name completely, or even reset the whole channel; caching; ...
- Each object/component could be a channel transmitter, so that they don't need a single communication object and every object could be listenedOn (as it is in Backbone)
*/
function Channel() {
  // Holds a list of event names. To each registered event there will be assigned an array of listeners (from subscribents).
  var events = {};

  // Calls each callback that listens to a raised event name
  function publish(name) {
    for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      params[_key - 1] = arguments[_key];
    }

    console.log("Published " + name + " with " + JSON.stringify(params));
    if (events[name] instanceof Array) events[name].forEach(function (listener) {
      return listener.fn.apply(listener.scope, params);
    });else console.log("Unhandled event " + name);
  }

  // Registers a listener for a provided event. Currently, ref to subscriber is not kept in the channel (it might be useful, though)
  function subscribe(name, fn, scope) {
    if (events[name] instanceof Array) events[name].push({
      fn: fn,
      scope: scope
    });else events[name] = [{
      fn: fn,
      scope: scope
    }];
    console.log("Subscribed to " + name + " with " + fn.name);
  }

  // De-registers a listener for a provided event. Exact same reference to a callback function has to be provided. Currently' that's the only way to deregister only supposed listener, and not all of assigned to the same event.
  function unsubscribe(name, removedFn) {
    if (events[name] instanceof Array) events[name] = events[name].filter(function (fn) {
      return fn !== removedFn;
    });
    console.log("Unsubscribed from " + name + " with " + removedFn.name);
  }

  return {
    publish: publish,
    subscribe: subscribe,
    unsubscribe: unsubscribe
  };
}

/*
This mimicks a true Allexis SDK. I didn't look at how exactly SDK works, how the calls look like and how its own messaging system works,
so this is more of a aproximation rather that a model of how to build SDK.
*/

// Assume this is the old SDK code.
window.AllexisSDK = {
  channel: new Channel(), // channel instance may or may not be assigned to the allexis SDK. The only requirement is that it is available globally, so that both Allexis SDK and Components could use it.
  // State below
  playedItem: null,
  // Methods below
  getFeed: function getFeed(feedId) {
    return fetch("https://api.myjson.com/bins/m0znl").then(function (response) {
      return response.json();
    });
  },
  getPriceForProduct: function getPriceForProduct(productId) {
    return "R 20,00";
  } // this is an improper way to return price, SDK should return a feed product list with calculated prices from a function above. This is solely introduced solely for demo purpose, so that actual response from BE could be used.
};

window.AllexisSDK.channel.subscribe("play", function (id) {
  if (id !== window.AllexisSDK.playedItem) {
    if (window.AllexisSDK.playedItem != null) {
      console.log("Channel stopped playing " + id);
      window.AllexisSDK.channel.publish("player:stopped", window.AllexisSDK.playedItem);
    }
    window.AllexisSDK.playedItem = id;
    console.log("Channel started playing " + id);
    window.AllexisSDK.channel.publish("player:started", id);
  }
});

window.AllexisSDK.channel.subscribe("buy", function (id) {
  console.log("Channel received a call to buy " + id);
  // actions performed to validate and/or make a call to BE
});

window.AllexisSDK.channel.subscribe("stop", function (id) {
  if (id === window.AllexisSDK.playedItem && window.AllexisSDK.playedItem != null) {
    window.AllexisSDK.playedItem = null;
    console.log("Channel stopped playing " + id);
    window.AllexisSDK.channel.publish("player:stopped", id);
  }
});

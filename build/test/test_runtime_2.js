(function () {

if (typeof(window) === "undefined") {
  var $$_runtime = require("bright").runtime;
} else {
  var $$_runtime = Bright.runtime;
}
(function () {
  "use strict";

  /* function header start */
  var $$_callback, $arguments;
  if (arguments.length < 1 || typeof(arguments[arguments.length - 1]) !== "function") {
    throw new Error("Need a callback parameter.");
  } else {
    $arguments = $$_runtime.parseArguments(arguments);
    $$_callback = $arguments.callback;
    $arguments = $arguments.arguments
  }
  var $$_callback_global = $$_callback;
  /* function header end */

  try {
    /* LINE:1 START */
    $$_runtime.conditionLoop(function () {
      return true;
    }, function ($$_continue, $$_break) {
      var $$_callback = $$_continue;
      /* LINE:2 START */
      setTime()
      /* LINE:2 END */
      /* LINE:3 START */
      var $$_sleep_ms = 500;
      $$_runtime.sleep($$_sleep_ms, function ($$_err) {
        /* LINE:4 START */
        return $$_callback(null);
        /* LINE:4 END */
      });
      /* LINE:3 END */
    }, function () {
      /* LINE:5 START */
      return $$_callback_global(null);
      /* LINE:5 END */
    });
    /* LINE:1 END */
  } catch (err) {
    return $$_callback_global(err);
  }
})(function (err) {
  if (err) console.error(err && err.stack);
});
})();
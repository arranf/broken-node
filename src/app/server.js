const express = require("express");
const exphbs = require("express-handlebars");
const os = require("os");

const pino = require("pino");
const expressPino = require("express-pino-logger");

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  let isHealthy = false;
  const logger = pino({ level: process.env.LOG_LEVEL || "info" });
  const expressLogger = expressPino({ logger });

  const app = express();
  app.use(expressLogger);
  app.engine("handlebars", exphbs({ defaultLayout: "main" }));
  app.set("view engine", "handlebars");

  // Configuration

  var port = process.env.PORT || getRandomInt(3000, 9000);
  var message = process.env.MESSAGE;

  if (!message) {
    logger.error("No MESSAGE env variable set");
    process.exit(1);
  }
  const delay = (seconds) =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  logger.info("Starting up container. This may take up to 15 seconds");
  await delay(getRandomInt(5, 15));

  var renderPathPrefix = process.env.RENDER_PATH_PREFIX
    ? "/" +
      process.env.RENDER_PATH_PREFIX.replace(/^[\\/]+/, "").replace(
        /[\\/]+$/,
        ""
      )
    : "";
  var handlerPathPrefix = process.env.HANDLER_PATH_PREFIX
    ? "/" +
      process.env.HANDLER_PATH_PREFIX.replace(/^[\\/]+/, "").replace(
        /[\\/]+$/,
        ""
      )
    : "";

  var namespace = process.env.KUBERNETES_NAMESPACE || "-";
  var podName = process.env.KUBERNETES_POD_NAME || os.hostname();
  var nodeName = process.env.KUBERNETES_NODE_NAME || "-";
  var nodeOS = os.type() + " " + os.release();

  logger.debug();
  logger.debug("Configuration");
  logger.debug("-----------------------------------------------------");
  logger.debug("PORT=" + process.env.PORT);
  logger.debug("MESSAGE=" + process.env.MESSAGE);
  logger.debug("RENDER_PATH_PREFIX=" + process.env.RENDER_PATH_PREFIX);
  logger.debug("HANDLER_PATH_PREFIX=" + process.env.HANDLER_PATH_PREFIX);
  logger.debug("KUBERNETES_NAMESPACE=" + process.env.KUBERNETES_NAMESPACE);
  logger.debug("KUBERNETES_POD_NAME=" + process.env.KUBERNETES_POD_NAME);
  logger.debug("KUBERNETES_NODE_NAME=" + process.env.KUBERNETES_NODE_NAME);
  logger.debug("CONTAINER_IMAGE=" + process.env.CONTAINER_IMAGE);

  // Handlers

  logger.debug();
  logger.debug("Handlers");
  logger.debug("-----------------------------------------------------");

  logger.debug("Handler: static assets");
  logger.debug('Serving from base path "' + handlerPathPrefix + '"');
  app.use(handlerPathPrefix, express.static("static"));

  logger.debug("Handler: /");
  logger.debug('Serving from base path "' + handlerPathPrefix + '"');
  app.get(handlerPathPrefix + "/", function (req, res) {
    res.render("home", {
      message: message,
      namespace: namespace,
      pod: podName,
      node: nodeName + " (" + nodeOS + ")",
      renderPathPrefix: renderPathPrefix,
    });
  });

  app.get(handlerPathPrefix + "/healthy", function (req, res) {
    res.json({
      isHealthy,
    });
    res.status(isHealthy ? 200 : 503);
  });

  // Server

  logger.debug();
  logger.debug("Server");
  logger.debug("-----------------------------------------------------");

  app.listen(port, function () {
    logger.info("Listening on: http://%s:%s", podName, port);
  });

  logger.info("Starting health check on /healthy");
  logger.info("Finishing up setup. This may take up to 10 seconds");
  await delay(getRandomInt(2, 10));

  isHealthy = true;
}

main();

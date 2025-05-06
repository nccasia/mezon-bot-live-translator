const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const translate = require('translatte');
const languages = require('translatte/languages');

dotenv.config();

COMMAND_PREFIX = process.env.COMMAND_PREFIX;
BOT_ID = process.env.BOT_ID;
DEFAULT_LANG = "en";

LIVE_STATUS_MAP = new Map();
LANG_MAP = new Map();

LIVE_COMMAND = "live";
OFF_COMMAND = "off";
STATUS_COMMAND = "status";
HELP_COMMAND = "help";
LANG_COMMAND = "lang";
LANG_LIST_COMMAND = "list";
DEBUG_COMMAND = "debug";

HELP_MESSAGE = `COMMANDS
!live
  turn on translator bot to auto translate message from channel

!off
  turn off translator bot, message will be not translate

!status
  return current status of translator bot

!lang
  set language from to

!list
  return all language code

!help
  list all command
`

const client = new MezonClient(process.env.APPLICATION_TOKEN);

async function main() {
  await client.login()
  client.onChannelMessage((event) => {
    // console.log("event: ", event);
    let originMessage = event?.content?.t;

    console.log("originMessage: ", originMessage);
    if (event?.sender_id == BOT_ID) {
      console.log("Ignore message from bot");
      return;
    }

    if (originMessage[0] == COMMAND_PREFIX) {
      let command = originMessage.split(" ")[0];
      handleCommand(command.substring(1, originMessage.length), event);
    } else {
      console.log("Message not start with prefix =", COMMAND_PREFIX);
      handleTranslate(event);
    }
  });
}

main()
  .then(() => {
    console.log("bot start!");
  })
  .catch((error) => {
    console.error(error);
  });

function handleCommand(command, event) {
  console.log("COMMAND", command);  
  console.log("event", event);

  switch(command) {
    case LIVE_COMMAND:
      handleLive(event);
      break;
    case OFF_COMMAND:
      handleOff(event);
      break;
    case STATUS_COMMAND:
      handleStatus(event);
      break;
    case HELP_COMMAND:
      handleHelp(event);
      break;
    case LANG_COMMAND:
      handleLang(event);
      break;
    case LANG_LIST_COMMAND:
      handleLangList(event);
      break;
    case DEBUG_COMMAND:
      handleDebug(event);
      break;
    // default:
      // handleTranslate(event);
  }
}

function handleLive(event) {
  console.log("handleLive");
  let message = "Translator bot is turn on!"

  LIVE_STATUS_MAP.set(event?.channel_id, true);

  sendRef(event, message);
}

function handleOff(event) {
  console.log("handleOff");
  let message = "Translator bot is turn off!"

  LIVE_STATUS_MAP.set(event?.channel_id, false);

  sendRef(event, message);
}

function handleStatus(event) {
  console.log("handleStatus");
  
  let status = LIVE_STATUS_MAP.get(event?.channel_id);
  console.log("status: ", status);
  let message = "Translator bot status is " + (status ? "on" : "off") + "\n"

  if (LANG_MAP.has(event?.channel_id)){
    let opt = LANG_MAP.get(event?.channel_id);
    message += "Current translate is from " +languages[opt.from]+" to " +languages[opt.to];
  }

  sendRef(event, message);
}

function handleHelp(event) {
  console.log("handleStatus");
  let message = HELP_MESSAGE;

  sendRef(event, message);
}

async function handleTranslate(event) {
  console.log("handleTranslate");

  if (!LIVE_STATUS_MAP.get(event?.channel_id)) {
    console.log("this channel is not enable translator");
    return;
  }
  
  let opt = {
    to: DEFAULT_LANG
  }

  if (LANG_MAP.has(event?.channel_id)) {
    opt = LANG_MAP.get(event?.channel_id)
    console.log("opt", opt);
  }

  translate(event?.content?.t, opt).then(res => {
    console.log(res.text);
    sendRef(event, res.text);
  }).catch(err => {
    console.error(err);
  });
}

function handleLang(event) {
  console.log("handleLang");

  let originMessage = event?.content?.t;
  let arr = originMessage.split(" ");
  let from = "";
  let to = "";

  console.log("arr:", arr);
  if (arr.length == 2) {
    to = arr[1];
  } else if (arr.length == 3) {
    from = arr[1];
    to = arr[2];
    if (!languages.isSupported(from)) {
      sendRef(event, "error: language code is not exists: "+from);
      return;
    }
  } else {
    sendRef(event, "error: format fail, EX: !lang en, EX: !lang en vi");
    return;
  }

  if (!languages.isSupported(to)) {
    sendRef(event, "error: language code is not exists: "+to);
    return;
  }

  LANG_MAP.set(event?.channel_id, {
    from,
    to
  });

  console.log("LANG_MAP: ", LANG_MAP);
  sendRef(event, "Language set is success from " +languages[from]+" to " +languages[to]);
}

function handleLangList(event) {
  console.log("handleLangList");
  let keys = Object.keys(languages);
  let valueToIgnore = ["isSupported", "getCode", "utf8Length"];
  let lines = keys
    .filter(item => !valueToIgnore.includes(item))
    .map(key => key+ " "+ languages[key]);
  let message = lines.join("\n");
  sendRef(event, message);
}

function handleDebug(event) {
  console.log("handleDebug");
  let message = "Status map: " + JSON.stringify(Array.from(LIVE_STATUS_MAP.entries())) + "\n";
  message+= "Lang map: " + JSON.stringify(Array.from(LANG_MAP.entries()))

  sendRef(event, message);
}

function sendRef(event, message) {
  const channel = client.channels.get(event?.channel_id);
  const comingMessage = channel.messages.get(event?.message_id);
  if (!comingMessage) {
    console.log("Cannot find message to reply");
    return;
  }
  comingMessage.reply(
    { t: message },
  );
}
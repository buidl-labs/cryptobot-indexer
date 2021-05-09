const { sequelize, Cryptobot, User } = require("./models");
const { get } = require("axios");

async function main() {
  sequelize.authenticate();
  const res = await updateCryptobots();
  console.log(res?.length ? res.length : 0, "cryptobots added to the DB.");
}

async function updateCryptobots() {
  /* 
    1. Loop over the Cryptobots.
    2. For every Cryptobot, check if it's in the DB.
      i. Yes, break.
      ii. No ->
        a. Find the user.
        b. Create the Cryptobot.
        c. Attach the Cryptobot, to the user.
  */

  const ADDRESS = "KT1V6cNW5jTUxEwmMhxvNHkMF3Bkm5a9Cfrt";
  offset = 0;
  const allCryptobots = [];
  while (true) {
    console.log(`Current offset: ${offset}`);
    const resp = await get(
      `https://api.better-call.dev/v1/contract/mainnet/${ADDRESS}/tokens?offset=${
        10 * offset
      }`
    );

    const cryptobots = resp.data;
    if (cryptobots === null || cryptobots?.length == 0) break;
    allCryptobots.push(...cryptobots);
    for (cryptobot of cryptobots) {
      console.log("Indexing cryptobot", cryptobot.token_id);

      let bot = await Cryptobot.findOne({
        where: { token_id: cryptobot.token_id },
      });

      if (bot) {
        console.log(`Bot-${cryptobot.token_id} already is in the DB.`);
        return;
      }

      bot = await Cryptobot.create({ token_id: cryptobot.token_id });
      console.log(`Bot-${bot.token_id} created.`);

      if (!cryptobot?.creators) {
        console.log("Bot doesn't have a creator.");
        continue;
      }

      const user = await User.findOne({
        where: { xtzAddress: cryptobot.creators[0] },
      });
      if (!user) {
        console.log("User not found.");
        continue;
      }

      await user.addCryptobot(bot);
      console.log("Cryptobot added to user.");
    }
    console.log("Increased offset.");
    offset += 1;
  }

  return allCryptobots;
}

main();

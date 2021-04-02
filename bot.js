/*
TODO:
- rewrite message system to work in attachments
- rewrite command system
*/

/*
BUGLIST:
- conversationContext is not generated in time to be used in first message of DMs
*/

/*
WHITELIST NOTE:
The whitelist will only work normally if the user is a bot.
If the user is not a bot, the whitelist will act as a list of channels that the user has had a conversation in before.
The user will automatically continue the conversastion in these channels, like the bot would if the channel was whitelisted.
*/
const translatte = require('translatte');
const redditImageFetcher = require("reddit-image-fetcher");
console.log("Importing Packages");
var fs = require('fs');
console.log("\tFS Imported");
const Discord = require("discord.js");
const discordTTS=require("discord-tts");
require('dotenv').config()

console.log("\tDiscord.js Imported");
const cleverbot_free = require('cleverbot-free');
console.log("\tCleverbot-Free Imported");
var colors = require('colors');
colors.setTheme({
	system: ['cyan'],
	warning: ['yellow'],
	error: ['red'],
	info: ['green']
});
console.log("\tColors Imported".rainbow);
console.log("Packages Imported\n".system);

console.log("Loading Authorization and Memory".system);

var filePath = './';
//if folder doesn't exist (like if they misspelled it)
if (!fs.existsSync(filePath)) 
{
	console.log("\tThe specified account path does not exist".warning);
	console.log("Loading Authorization and Memory Failed".error);
	console.log("Exiting Process".system);
	process.exit();
}
//if one or both files don't exist (like if they set up the account files wrong)
if (!fs.existsSync(filePath + 'auth.json') || !fs.existsSync(filePath + 'memory.json'))
{
	console.log("\tAccount path is missing essential files".warning);
	console.log("Loading Authorization and Memory Failed".error);
	console.log("Exiting Process".system);
	process.exit();
}

var auth = require(filePath + 'auth.json');
var memory = JSON.parse(fs.readFileSync(filePath + 'memory.json'));
console.log("Authorization and Memory Loaded\n".system);

// Initialize Cleverbot AI
console.log("Initializing Cleverbot AI".system);
var cleverbot = cleverbot_free;
console.log("Cleverbot AI Initialized\n".system);

// Initialize Discord Bot
console.log("Initializing Discord Client".system);
const client = new Discord.Client();
console.log("Discord Client Initialized\n".system);

var alreadyThinking = {
	//channelID: true/false
};
var conversationContext = {
	//channelID: ["past", "messages"]
};

var typingSpeed = 0.3; //characters per second

var connect = function() {
	console.log("Logging in".system);
	client.login(process.env.TOKEN).catch(connectionError);
}

client.on('ready', () => {
	console.log("Login Complete, Client Ready".system);
	console.log("\tLogged in as:".system);
	console.log("\t\tUsername: ".system + client.user.tag);
	console.log("\t\tUserID:   ".system + client.user.id);
	console.log("\t\tBotUser:  ".system + client.user.bot);

	client.user.setActivity("Fale comigo! Use @ganso !enable para ativar minhas respostas.");

	//GUILDS LIST
	console.log("\tGuilds List".info);
	var guildsArr = client.guilds.array();	
	for (var i = 0; i < guildsArr.length; i++)
	{
		console.log("\t\t" + guildsArr[i].name + " (".info + guildsArr[i].id + ")".info);
	}
	console.log("\tEnd of Guilds List\n".info);
	
	//WHITELISTED CHANNELS LIST
	console.log("\tWhitelisted Channels List".info);
	var channelsArr = client.channels.array();
	for (var i = 0; i < channelsArr.length; i++)
	{
		if (isWhitelisted(channelsArr[i].id))
		{
			var channelName;
			var channelID;
			var guildName;
			var guildID;
			if (channelsArr[i].type === 'dm')
			{
				channelName = channelsArr[i].recipient.tag;
				channelID = channelsArr[i].id;
				guildName = "Direct Message";
				guildID = "NA";
			}
			else if (channelsArr[i].type === 'text')
			{
				channelName = channelsArr[i].name;
				channelID = channelsArr[i].id;
				guildName = channelsArr[i].guild.name;
				guildID = channelsArr[i].guild.id;
			}
			
			console.log("\t\t" + channelName + " (".info + channelID + ")".info);
			console.log("\t\t\t" + guildName + " (".info + guildID + ")".info);

		}
	}
	console.log("\tEnd of Whitelisted Channels List\n".info);
	
	//CONVERSATION CONTEXT
	for (var i = 0; i < channelsArr.length; i++)
	{
		if (isWhitelisted(channelsArr[i].id))
		{
			createContextForChannel(channelsArr[i]);
		}
	}
	
	//SCANNING FOR UNREAD MESSAGES
	console.log("Scanning Previous Messages".system);	
	for (var i = 0; i < channelsArr.length; i++)
	{					
		//if on whitelisted channel, and not voice channel, and there is a last message
		if (isWhitelisted(channelsArr[i].id) && channelsArr[i].type !== "voice")
		{			
			channelsArr[i].fetchMessages({ limit: 10 }).then(messages => {	
				//make it so the bot goes through the messages and ignores ones that have commands or > in them			
				var message, m = 0;
				do {
					message = messages.array()[m];
					if (message === undefined || message.author.id === client.user.id) return;
					m++;
				} while ((isMarkedAsIgnore(message) || hasACommand(message)) && m < messages.array().length);
				
				//debug info
				var guildName;
				var guildID;
				var channelName;
				var channelID = message.channel.id;
				var authorTag = message.author.tag;;
				var authorID = message.author.id;
				var authorBot = message.author.bot;
				if (message.channel.type === 'dm')
				{
					guildName = "Direct Message";
					guildID = "NA";
					channelName = message.channel.recipient.tag; 
				}
				else if (message.channel.type === 'text')
				{
					guildName = message.channel.guild.name;
					guildID = message.channel.guild.id;
					channelName = message.channel.name;
				}					
				console.log("\tFound New Unread Message".system);
				console.log("\t\tAuthor:  ".system + authorTag + " (".system + authorID + ")".system);
				console.log("\t\tBot:     ".system + authorBot);
				console.log("\t\tGuild:   ".system + guildName + " (".system + guildID + ")".system);
				console.log("\t\tChannel: ".system + channelName + " (".system + channelID + ")".system);
				console.log("\t\tMessage: ".system + message.cleanContent);
				console.log("\tReferring to Response Generation".system);
				//generateAndRespond(message);
				onMessage(message);
			}).catch(console.error);
		}
	}
	console.log("Done Scanning".system);

});

var connectionError = function() {
	console.log("Connection Error!".error);
	console.log("Retrying connection in 1 second\n".error);
	setTimeout(connect, 1000); //use connect() function in 1 second
}

client.on('reconnecting', () => {
	console.log("Attempting to Reconnect...\n".error);
});

client.on('error', error => {
	console.log("Connection Error: ".error + error);
});

client.on('message', message => onMessage(message));

var onMessage = function (message) {
	if (message.author.id === client.user.id) return;
	if (message.content === "") return; //ignore media messages w/o text
	
	//debug info
	var guildName;
	if (message.channel.type === 'dm') guildName = "Mensagem direta";
	else if (message.channel.type === 'text') guildName = message.channel.guild.name;
	var channelName;
	if (message.channel.type === 'dm') channelName = message.channel.recipient.tag;
	else if (message.channel.type === 'text') channelName = message.channel.name;
	var channelID;
	channelID = message.channel.id;

	if (isAMention(message.content) || message.channel.type === 'dm') //treat DMs as commands or always respond
	{
		//console.log("Is a mention or DM");
		
		if (hasACommand(message) && client.user.bot) //is a command (only for bot users)
		{
			var cmd = removeMention(message.content).toLowerCase().trim().replace("!", "");
			if (cmd === "whitelist" || cmd === "enable" || cmd == "lansa") //WHITELIST
			{
				if (message.channel.type === 'dm')
				{
					var richEmbed = 
					{
						"embed": {
							"title": "Mensagem direta",
							"description": "<@" + client.user.id + "> está sempre ligado nas mensagens diretas",
						//"color": 65280, //green
						"color": 13621503, //icy white
						"thumbnail": {
							"url": "https://cdn.discordapp.com/attachments/398641708319113226/443818626156462114/embed_thumbnail.png"
						}
					}
				}
				
				message.channel.send(richEmbed);
			}
			else
			{
				whitelist(message.channel);

				var richEmbed = 
				{
					"embed": {
						"title": client.user.username + " ativado para o \"" + channelName + "\"",
						"description": "Você ativou <@" + client.user.id + "> para <#" + channelID + ">. Isso significa que irei responder todas as mensagens.",
						"color": 65280, //green
						//"color": 13621503, //icy white
						"thumbnail": {
							"url": "https://cdn.discordapp.com/attachments/398641708319113226/443818626156462114/embed_thumbnail.png"
						},
						"fields": [
						{
							"name": "Desativando",
							"value": "Se quiser que o <@" + client.user.id + "> pare de responder no <#" + channelID + ">, use um dos comandos:\n*@" + client.user.tag + " !disable*\n*@" + client.user.tag + " !unwhitelist*\n*@" + client.user.tag + " !unallow*"
						}
						]
					}
				}
				
				message.channel.send(richEmbed);
			}
		}
			else if (cmd === "unwhitelist" || cmd === "disable" || cmd === "unallow") //UNWHITELIST
			{
				if (message.channel.type === 'dm')
				{
					var richEmbed = 
					{
						"embed": {
							"title": "Mensagem direta",
							"description": "<@" + client.user.id + "> está sempre ligado nas mensagens diretas",
						//"color": 65280, //green
						"color": 13621503, //icy white
						"thumbnail": {
							"url": "https://cdn.discordapp.com/attachments/398641708319113226/443818626156462114/embed_thumbnail.png"
						}
					}
				}
				
				message.channel.send(richEmbed);
			}
			else
			{
				unwhitelist(message.channel);

				var richEmbed = 
				{
					"embed": {
						"title": client.user.username + " foi desativado para o \"" + channelName + "\"",
						"description": "Você desligou <@" + client.user.id + "> para o canal <#" + channelID + ">. Isso significa que somente irei responder se me mencionar.",
						"color": 16711680, //red
						//"color": 13621503, //icy white
						"thumbnail": {
							"url": "https://cdn.discordapp.com/attachments/398641708319113226/443818626156462114/embed_thumbnail.png"
						},
						"fields": [
						{
							"name": "Re-ativando",
							"value": "Se quiser que o <@" + client.user.id + "> comece à responder em <#" + channelID + ">, envie um dos comandos: \n*@" + client.user.tag + " !enable*\n*@" + client.user.tag + " !whitelist*\n*@" + client.user.tag + " !lansa*"
						}
						]
					}
				}
				
				message.channel.send(richEmbed);
			}
		}

		return;
	}
}

	//if the user is not a bot, than automatically whitelist any channel you get a message from, as long as it isn't muted
	if (!client.user.bot)
	{
		if (!isWhitelisted(channelID) && message.channel.type !== 'dm')
			if (!message.channel.muted && !message.guild.muted)
				whitelist(message.channel);
		//and unwhitelist ones that get muted	
		if (isWhitelisted(channelID) && (message.channel.muted || message.guild.muted))
			unwhitelist(message.channel);
	}
	
	if (isWhitelisted(channelID) || isAMention(message.content) || message.channel.type === 'dm') //can respond
	{
		if (!isMarkedAsIgnore(message)) //special ignore code
		{
			generateAndRespond(message);
		}			
	}
}

var isAMention = function(message){
	return (message.includes("<@!" + client.user.id + ">") || message.includes("<@" + client.user.id + ">") || message.toLowerCase().includes("ganso"));
}

var removeMention = function(message) {
	message = message.replace("<@!" + client.user.id + ">", "");
	message = message.replace("<@" + client.user.id + ">", "");
	return message;
}

var hasACommand = function(message) {
	var content = removeMention(message.content);
	content = content.trim();
	return (content.charAt(0) === '!');
}

var isMarkedAsIgnore = function(message) {
	return (message.cleanContent.split(" ")[0] === ">");
}

var isWhitelisted = function(channelID) {	
	for (var i = 0; i < memory.whitelist.length; i++)
	{
		if (memory.whitelist[i] === channelID) return true;
	}
	return false;
}

var whitelist = function(channel) {
	if (memory.whitelist.indexOf(channel.id) === -1)
	{
		memory.whitelist.push(channel.id);
		syncMemory();
	}
	
	console.log("This bot has been enabled for a new channel!".system);
	console.log("\tGuild Name:   ".system + channel.guild.name);
	console.log("\tChannel Name: ".system + channel.name);
}

var unwhitelist = function(channel) {
	var index = memory.whitelist.indexOf(channel.id);
	if (index !== -1)
	{
		memory.whitelist.splice(index, 1);
		syncMemory();
	}

	console.log("\n");
	console.log("This bot has been disabled on a channel.".system);
	console.log("\tGuild Name:   ".system + channel.guild.name);
	console.log("\tChannel Name: ".system + channel.name);
}

var createContextForChannel = function(channel) {

	conversationContext[channel.id] = [];
	channel.fetchMessages({ limit: 20 }).then(messages => {
		var messagesArr = messages.array();
		var lastOneFromMe = true;
		for (var j = 0; j < messagesArr.length; j++)
		{
			//if prefixed with >, or is a command, or is empty, ignore
			if (isMarkedAsIgnore(messagesArr[j]) || hasACommand(messagesArr[j]) || messagesArr[j].content === "") continue;
			//if the latest message IS NOT from the bot, don't add to the context, because it'll be added by generateAndRespond() later
			if (j == 0 && messagesArr[j].author.id !== client.user.id) continue;
			
			var thisOneFromMe = (messagesArr[j].author.id === client.user.id);
			if (!lastOneFromMe && !thisOneFromMe) //if last message wasn't from bot and current message isn't either
			{
				conversationContext[channel.id].unshift(""); //add a placeholder
			}
			lastOneFromMe = thisOneFromMe;
			
			conversationContext[channel.id].unshift(formatDiscordToCleverbot(messagesArr[j].content));
		}
	}).catch(console.error);
}

var formatCleverbotToDiscord = function(response){
	response = response.replace(":)", ":slight_smile:");
	response = response.replace("(:", ":upside_down:");
	
	response = response.replace(";)", ":wink:");
	response = response.replace("(;", ":wink:");
	
	response = response.replace("):", ":slight_frown:");
	response = response.replace(":(", ":slight_frown:");
	
	response = response.replace(":O", ":open_mouth:");
	
	response = response.replace(":\\", ":confused:");
	response = response.replace(":/", ":confused:");
	
	response = response.replace(":'(", ":cry:");
	
	response = response.replace(":$", ":confused:");
	
	response = response.replace("XD", ":stuck_out_tongue_closed_eyes:");
	
	response = response.replace("♥", ":heart:");
	response = response.replace("❤", ":heart:");
	response = response.replace("❥", ":heart:");
	
	return response;
}

var formatDiscordToCleverbot = function(response){
	response = response.replace(":slight_smile:", ":)");
	response = response.replace(":upside_down:", "(:");
	
	response = response.replace(":wink:", ";)");
	response = response.replace(":wink:", "(;");
	
	response = response.replace(":slight_frown:", "):");
	//response = response.replace(":slight_frown:", ":(");
	
	response = response.replace(":open_mouth:", ":O");
	
	response = response.replace(":confused:", ":\\");
	response = response.replace(":confused:", ":/");
	
	response = response.replace(":cry:", ":'(");
	
	response = response.replace(":confused:", ":$");
	
	response = response.replace(":stuck_out_tongue_closed_eyes:", "XD");
	
	response = response.replace(":heart:", "♥");
	//response = response.replace(":heart:", "❤");
	//response = response.replace(":heart:", "❥");
	
	return response;
}

var syncMemory = function() {
	fs.writeFileSync(filePath + 'memory.json', JSON.stringify(memory)); 
}

var generateAndRespond = function(message) { 
	//debug info
	var guildName;
	var guildID;
	var channelName;
	var channelID = message.channel.id;
	var authorTag = message.author.tag;;
	var authorID = message.author.id;
	var authorBot = message.author.bot;
	if (message.channel.type === 'dm')
	{
		guildName = "Direct Message";
		guildID = "NA";
		channelName = message.channel.recipient.tag; 
	}
	else if (message.channel.type === 'text')
	{
		guildName = message.channel.guild.name;
		guildID = message.channel.guild.id;
		channelName = message.channel.name;
	}
	/*
	//already thinking
	if (alreadyThinking[message.channel.id])
	{
		console.log("\n");
		console.log("Message: ".system + message.cleanContent);
		console.log("\tAuthor:  ".system + authorTag + " (".system + authorID + ")".system);
		console.log("\tBot:     ".system + authorBot);
		console.log("\tGuild:   ".system + guildName + " (".system + guildID + ")".system);
		console.log("\tChannel: ".system + channelName + " (".system + channelID + ")".system);
		console.log("Response: ".system + "[ignoring because already thinking]");
		return;
	}*/
	alreadyThinking[message.channel.id] = true;
	
	//generate response
	var input = formatDiscordToCleverbot(message.cleanContent);
	if (conversationContext[message.channel.id] === undefined)
		createContextForChannel(message.channel);
	var context = conversationContext[message.channel.id];
	cleverbot(input, context).then(response => {
		response = formatCleverbotToDiscord(response);

		console.log("\n");
		console.log("Message: ".system + message.cleanContent);
		console.log("\tAuthor:  ".system + authorTag + " (".system + authorID + ")".system);
		console.log("\tBot:     ".system + authorBot);
		console.log("\tGuild:   ".system + guildName + " (".system + guildID + ")".system);
		console.log("\tChannel: ".system + channelName + " (".system + channelID + ")".system);
		console.log("Response: ".system + response);

		sendMessage(message, message.channel, response, true);
		conversationContext[message.channel.id].push(response);

		//alreadyThinking[message.channel.id] = false;
	});
	conversationContext[message.channel.id].push(input);
}

var sendMessage = function(message, channel, content, simTyping) {
	if (simTyping === undefined) simTyping = false;
	
	if (simTyping)
	{
		var timeTypeSec = content.length / typingSpeed;
		
		message.channel.startTyping();
		setTimeout(
			function() { 
				message.channel.stopTyping(); 
				if(message.content.toLowerCase().includes("meme"))
				{
					redditImageFetcher.fetch({type: 'meme'})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("wallpaper") || message.content.toLowerCase().includes("papel de parede"))
				{
					redditImageFetcher.fetch({type: 'wallpaper'})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("foto de anime") || message.content.toLowerCase().includes("ft de anime")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['AnimePics']})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				}  else if(message.content.toLowerCase().includes(" mão") || message.content.toLowerCase().includes(" mao")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['Hands']})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("pé")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['cutefeets']})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				}  else if(message.content.toLowerCase().includes("shitpost")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['ShitpostXIV']})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("shitpost") && message.content.toLowerCase().includes("arab") || message.content.toLowerCase().includes("shitpost") && message.content.toLowerCase().includes("árabe")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['arabfunny']})
					.then(result => {
						message.channel.send(`> ${message.content}\n <@${message.author.id}> ${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else {
					translatte(content, {to: 'pt'}).then(res => {
						let traduzidor = (res.text == content) ? ("") : (`(${content})`)
						message.channel.send(`> ${message.content}\n <@${message.author.id}>, ${res.text} ${traduzidor}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
					}).catch(err => { 
						message.channel.send(`> ${message.content}\n <@${message.author.id}>, ${res.text}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
					});
				}
			}, 
			400
			);
	}
	else
	{
		message.reply(content);
	}
}
var sendingMessageError = function(err, res) {
	if (err != null) console.error('\tERROR: could not send message\n\terr = [' + err + '], res = [' + res + ']');
}
function getRandom(min = 0, max) {
	return Math.floor(Math.random() * (max - min) ) + min;
}
connect();

const translatte = require('translatte');
const redditImageFetcher = require("reddit-image-fetcher");
console.log("Importando pacotes");
var fs = require('fs');
console.log("\tFS importado");
const Discord = require("discord.js");
require('dotenv').config()

console.log("\tDiscord.js importado");
const cleverbot_free = require('cleverbot-free');
console.log("\tCleverbot-Free importado");
var colors = require('colors');
colors.setTheme({
	system: ['cyan'],
	warning: ['yellow'],
	error: ['red'],
	info: ['green']
});
console.log("\tColors importado".rainbow);
console.log("Packages importado\n".system);

console.log("Carregando memoria".system);

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
console.log("Memoria carregada.\n".system);

// Initialize Cleverbot AI
console.log("Iniciando Cleverbot AI".system);
var cleverbot = cleverbot_free;
console.log("Cleverbot AI Inicializado\n".system);
// Initialize Discord Bot
console.log("Iniciando Discord Client".system);
require('discord-inline-reply');
const client = new Discord.Client();
console.log("Discord Client inicializado.\n".system);

var alreadyThinking = {
	//channelID: true/false
};
var conversationContext = {
	//channelID: ["past", "messages"]
};

var typingSpeed = 0.3;

var connect = function() {
	console.log("Logando...".system);
	client.login(process.env.TOKEN).catch(connectionError);
}

client.on('ready', () => {
	console.log("Login efetuado.".system);
	console.log("\tLogado como:".system);
	console.log("\t\tUsuario: ".system + client.user.tag);
	console.log("\t\tID:   ".system + client.user.id);
	console.log("\t\tBot:  ".system + client.user.bot);

	client.user.setActivity("Vamos conversar, fofinho? >//< g!ativar");

	//GUILDS LIST
	console.log("\tLista de servidores".info);
	var guildsArr = client.guilds.cache;	
	for (var i = 0; i < guildsArr.length; i++)
	{
		console.log("\t\t" + guildsArr[i].name + " (".info + guildsArr[i].id + ")".info);
	}
	console.log("\tFim da lista de servidores\n".info);
	
	//WHITELISTED CHANNELS LIST
	console.log("\tLista de canais em whitelist".info);
	var channelsArr = client.channels.cache;
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
				guildName = "Mensagem direta";
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
	console.log("\tFim da whitelist\n".info);
	
	//CONVERSATION CONTEXT
	for (var i = 0; i < channelsArr.length; i++)
	{
		if (isWhitelisted(channelsArr[i].id))
		{
			createContextForChannel(channelsArr[i]);
		}
	}
	
	//SCANNING FOR UNREAD MESSAGES
	console.log("Scaneando mensagens nao-lidas".system);	
	for (var i = 0; i < channelsArr.length; i++)
	{					
		//if on whitelisted channel, and not voice channel, and there is a last message
		if (isWhitelisted(channelsArr[i].id) && channelsArr[i].type !== "voice")
		{			
			channelsArr[i].messages.fetch({ limit: 10 }).then(messages => {	
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
					guildName = "Mensagem direta";
					guildID = "NA";
					channelName = message.channel.recipient.tag; 
				}
				else if (message.channel.type === 'text')
				{
					guildName = message.channel.guild.name;
					guildID = message.channel.guild.id;
					channelName = message.channel.name;
				}					
				console.log("\tNovas mensagens nao-lidas:".system);
				console.log("\t\tAutor:  ".system + authorTag + " (".system + authorID + ")".system);
				console.log("\t\tBot:     ".system + authorBot);
				console.log("\t\tGuilda:   ".system + guildName + " (".system + guildID + ")".system);
				console.log("\t\tCanal: ".system + channelName + " (".system + channelID + ")".system);
				console.log("\t\tMensagem: ".system + message.cleanContent);
				console.log("\tRespondendo mensagem!".system);
				//generateAndRespond(message);
				onMessage(message);
			}).catch(console.error);
		}
	}
	console.log("Done Scanning".system);

});

var connectionError = function() {
	console.log("Erro de conexao!".error);
	console.log("Reconectando em 1 second\n".error);
	setTimeout(connect, 1000);
}

client.on('reconnecting', () => {
	console.log("Reconectando...\n".error);
});

client.on('error', error => {
	console.log("Erro de conexao: ".error + error);
});

client.on('message', message => onMessage(message));

var onMessage = function (message) {
	if (message.author.id === client.user.id) return;
	if (message.content === "") return;
	
	//debug info
	var guildName;
	if (message.channel.type === 'dm') guildName = "Mensagem direta";
	else if (message.channel.type === 'text') guildName = message.channel.guild.name;
	var channelName;
	if (message.channel.type === 'dm') channelName = message.channel.recipient.tag;
	else if (message.channel.type === 'text') channelName = message.channel.name;
	var channelID;
	channelID = message.channel.id;

	if (hasACommand(message) && client.user.bot)
	{
		var cmd = message.content.toLowerCase().trim().replace("g!", "");
		if (cmd === "whitelist" || cmd === "enable" || cmd == "ativar")
		{
			if (message.channel.type === 'dm')
			{
				var richEmbed = {
					"embed": {
						"title": "Canal ativado.",
						"description": "Este canal(``"+channelName+"``) é privado, e está sempre ativado! :)",
						"color": 2343490,
						"thumbnail": {
							"url": client.user.displayAvatarURL()
						},
						"image": {
							"url": "https://i.kym-cdn.com/photos/images/newsfeed/001/597/651/360.jpg"
						}
					}
				};
				
				message.lineReply(richEmbed);
			}
			else
			{
				whitelist(message.channel);

				var richEmbed = {
					"embed": {
						"title": "Canal ativado.",
						"description": "Este canal(``"+channelName+"``) agora receberá respostas do Ganso! :)",
						"color": 2343490,
						"thumbnail": {
							"url": client.user.displayAvatarURL()
						},
						"image": {
							"url": "https://i.kym-cdn.com/photos/images/newsfeed/001/597/651/360.jpg"
						},
						"fields": [
						{
							"name": "Como ativar?",
							"value": "Para ativar o Ganso, digite ``g!ativar``",
							"inline": true
						},
						{
							"name": "Como desativar?",
							"value": "Para desativar o Ganso, digite ``g!desativar``",
							"inline": true
						}
						]
					}
				};
				
				message.lineReply(richEmbed);
			}
		}
		else if (cmd === "unwhitelist" || cmd === "disable" || cmd === "desativar")
		{
			if (message.channel.type === 'dm')
			{
				var richEmbed = {
					"embed": {
						"title": "Canal ativado.",
						"description": "Este canal(``"+channelName+"``) é privado, e está sempre ativado! :)",
						"color": 2343490,
						"thumbnail": {
							"url": client.user.displayAvatarURL()
						},
						"image": {
							"url": "https://i.kym-cdn.com/photos/images/newsfeed/001/597/651/360.jpg"
						}
					}
				};
				
				message.lineReply(richEmbed);
			}
			else
			{
				unwhitelist(message.channel);
				
				var richEmbed = {
					"embed": {
						"title": "Canal desativado.",
						"description": "Este canal(``"+channelName+"``) não receberá mais respostas do Ganso! :(",
						"color": 2343490,
						"thumbnail": {
							"url": client.user.displayAvatarURL()
						},
						"image": {
							"url": "https://pbs.twimg.com/media/BDuiD1LCUAAK5O3.jpg"
						},
						"fields": [
						{
							"name": "Como ativar?",
							"value": "Para reativar o Ganso, digite ``g!ativar``",
							"inline": true
						},
						{
							"name": "Como desativar?",
							"value": "Para desativar o Ganso, digite ``g!desativar``",
							"inline": true
						}
						]
					}
				};
				message.lineReply(richEmbed);
			}
		}

		return;
	}

	if (!client.user.bot)
	{
		if (!isWhitelisted(channelID) && message.channel.type !== 'dm')
			if (!message.channel.muted && !message.guild.muted)
				whitelist(message.channel);
			if (isWhitelisted(channelID) && (message.channel.muted || message.guild.muted))
				unwhitelist(message.channel);
		}
		var item = frases[Math.floor(Math.random()*frases.length)];
		if(getRandom(0, 30) == 3)
			return message.lineReply(item);
		if (isWhitelisted(channelID) || isAMention(message.content) || message.channel.type === 'dm')
		{
			if (!isMarkedAsIgnore(message))
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
		return message.content.toLowerCase().startsWith("g!");
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

		console.log("Bot ativado em um novo canal!".system);
		console.log("\tGuilda:   ".system + channel.guild.name);
		console.log("\tCanal: ".system + channel.name);
	}

	var unwhitelist = function(channel) {
		var index = memory.whitelist.indexOf(channel.id);
		if (index !== -1)
		{
			memory.whitelist.splice(index, 1);
			syncMemory();
		}

		console.log("\n");
		console.log("Bot desativado em um canal!".system);
		console.log("\tGuilda:   ".system + channel.guild.name);
		console.log("\tCanal: ".system + channel.name);
	}

	var createContextForChannel = function(channel) {

		conversationContext[channel.id] = [];
		channel.messages.fetch({ limit: 20 }).then(messages => {
			var messagesArr = messages.array();
			var lastOneFromMe = true;
			for (var j = 0; j < messagesArr.length; j++)
			{
				if (isMarkedAsIgnore(messagesArr[j]) || hasACommand(messagesArr[j]) || messagesArr[j].content === "") continue;
				if (j == 0 && messagesArr[j].author.id !== client.user.id) continue;

				var thisOneFromMe = (messagesArr[j].author.id === client.user.id);
				if (!lastOneFromMe && !thisOneFromMe)
				{
					conversationContext[channel.id].unshift("");
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

		response = response.replace(":open_mouth:", ":O");

		response = response.replace(":confused:", ":\\");
		response = response.replace(":confused:", ":/");

		response = response.replace(":cry:", ":'(");

		response = response.replace(":confused:", ":$");

		response = response.replace(":stuck_out_tongue_closed_eyes:", "XD");

		response = response.replace(":heart:", "♥");

		return response;
	}

	var syncMemory = function() {
		fs.writeFileSync(filePath + 'memory.json', JSON.stringify(memory)); 
	}

	var generateAndRespond = function(message) { 
		var guildName;
		var guildID;
		var channelName;
		var channelID = message.channel.id;
		var authorTag = message.author.tag;;
		var authorID = message.author.id;
		var authorBot = message.author.bot;
		if (message.channel.type === 'dm')
		{
			guildName = "Mensagem direta";
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
	
	var input = formatDiscordToCleverbot(message.cleanContent);
	if (conversationContext[message.channel.id] === undefined)
		createContextForChannel(message.channel);
	var context = conversationContext[message.channel.id];
	cleverbot(input, context).then(response => {
		response = formatCleverbotToDiscord(response);

		console.log("\n");
		console.log("Mensagem: ".system + message.cleanContent);
		console.log("\tAutor:  ".system + authorTag + " (".system + authorID + ")".system);
		console.log("\tBot:     ".system + authorBot);
		console.log("\tGuilda:   ".system + guildName + " (".system + guildID + ")".system);
		console.log("\tCanal: ".system + channelName + " (".system + channelID + ")".system);
		console.log("Resposta: ".system + response);

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
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("wallpaper") || message.content.toLowerCase().includes("papel de parede"))
				{
					redditImageFetcher.fetch({type: 'wallpaper'})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("foto de anime") || message.content.toLowerCase().includes("ft de anime")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['AnimePics']})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				}  else if(message.content.toLowerCase().includes(" mão") || message.content.toLowerCase().includes(" mao")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['Hands']})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("pé")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['cutefeets']})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				}  else if(message.content.toLowerCase().includes("shitpost")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['ShitpostXIV']})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else if(message.content.toLowerCase().includes("shitpost") && message.content.toLowerCase().includes("arab") || message.content.toLowerCase().includes("shitpost") && message.content.toLowerCase().includes("árabe")) {
					redditImageFetcher.fetch({type: 'custom', subreddit: ['arabfunny']})
					.then(result => {
						message.lineReplyNoMention(`${result[0].image}`).then(message => console.log("Enviado: ".system + message.content)).catch(sendingMessageError);
						alreadyThinking[channel.id] = false;
					}); 
				} else {
					translatte(content, {to: 'pt'}).then(res => {
						message.lineReplyNoMention(`${res.text}`);
					}).catch(err => {
						message.lineReplyNoMention(`${content}`);
					});
				}
			}, 
			400
			);
	}
	else
	{
		message.lineReply(content);
	}
}
var sendingMessageError = function(err, res) {
	if (err != null) console.error('\tERRO: Nao consegui enviar a mensagem.\n\terr = [' + err + '], res = [' + res + ']');
}
function getRandom(min = 0, max) {
	return Math.floor(Math.random() * (max - min) ) + min;
}
connect();


var frases = [
"gewnso veodeominer p mendi\ndesculpa eu nao consigo digitar com patas",
"Eu nasci para causar caos",
"Sabia que o Discord foi criado por causa de mim? Eu sou o simbolo da discórdia!",
"Eu causo problemas de propósito : D",
"https://i.imgur.com/wFvcCS7.png",
"https://i.imgur.com/P6r2Den.gif",
"https://i.imgur.com/CHMywM6.mp4",
"https://i.imgur.com/6y7CwKQ.png",
"https://i.imgur.com/gz9sCXk.png",
"https://i.imgur.com/X6RHPiA.png",
"https://i.imgur.com/LI79pyY.gif",
"https://i.imgur.com/zEQ6cpy.jpg",
"https://i.imgur.com/g1UgqYk.jpg",
"https://i.imgur.com/6V6LTHW.jpg",
"https://i.imgur.com/RlGb6AQ.jpg",
"https://i.imgur.com/ZJAbItv.jpg",
"https://i.imgur.com/pTH1P1j.jpg",
"https://i.imgur.com/1WMy452.jpg",
"https://i.imgur.com/4HvcRUd.jpg",
"https://i.imgur.com/577fQOx.jpg",
"https://i.imgur.com/fO6JkfL.jpg",
"https://i.imgur.com/8hT4LHb.jpg",
"https://i.imgur.com/wjZkyPK.jpg",
"https://i.imgur.com/9FuFBd2.jpg",
"https://i.imgur.com/xokrp0F.png",
"https://i.imgur.com/HeDu8Bc.jpg",
"https://i.imgur.com/CMEzWXj.jpg",
"https://i.imgur.com/XzoGaQM.jpg",
"https://i.imgur.com/FwjYDQh.jpg",
"https://i.imgur.com/FHXGgDF.jpg",
"https://i.imgur.com/qli2vxi.jpg",
"https://i.imgur.com/4FYbnWq.jpg",
"https://i.imgur.com/O1bUGKu.jpg",
"https://i.imgur.com/oki0Stc.jpg",
"https://i.imgur.com/4ebNqiA.jpg",
"https://i.imgur.com/UuIvKdr.jpg",
"https://i.imgur.com/jRApXNm.png",
"https://i.imgur.com/rLu9HEC.jpg",
"https://i.imgur.com/nbN5ZbO.jpg",
"https://i.imgur.com/zeVlKBg.jpg",
"https://i.imgur.com/w1jvzaQ.png",
"https://i.imgur.com/KUhHlWz.png",
"https://i.imgur.com/QedHMld.png",
"https://i.imgur.com/GblAnGq.jpg",
"https://i.imgur.com/WHWtYii.png",
"https://i.imgur.com/ZKC3Nys.jpg",
"https://i.imgur.com/meGN9q5.jpg",
"https://i.imgur.com/9YRPEIv.jpg",
"https://i.imgur.com/cSrEQlV.jpg",
"https://i.imgur.com/xkSmOZs.jpg",
"https://i.imgur.com/7wcasFZ.jpg",
"https://i.imgur.com/gBddkde.jpg",
"https://i.imgur.com/YWTUs4u.png",
"https://i.imgur.com/pcsLXOc.png",
"https://i.imgur.com/XIWzMJs.png"
]
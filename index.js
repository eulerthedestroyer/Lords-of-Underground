//files
const methods = require("./methods")
const config = require("./config")
const database = require("./database.js")
//modules
const Discord = require('discord.js');
const client = new Discord.Client();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_LINK, {useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open',()=>{
    // we're connected!
    const person_schema = new mongoose.Schema({
        name: String,
        id: String,
        money: Number,
        items: Array,
        gang: String,
        arrested:Boolean,
        notoriety: Number,
        cooldown: Object,
        level:Number
    });
    const Person = mongoose.model('Person', person_schema);
    const market_offer = new mongoose.Schema({
        author: String,
        item: String,
        cost: Number,
        amount: Number,
        short_id:String
    });
    const Offer = mongoose.model('Offer', market_offer);
//start bot
    client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    });
    //bot recieves a message
    client.on('message', async (msg) => {
        if(msg.author.bot){
            return
        }
        const msg_array = msg.content.split(" ")
        const command =msg_array[0]
        //valid command
        database.increase_level(msg.author.id, Person)
        if(Object.keys(config.commands).includes(command)){
            if(msg_array.length-1 !=config.commands[command].args ){
                msg.reply("invalid number of arguments")
                return
            }
            let person = await database.find_person(msg.author.id,Person)
            if(!person.success){
                msg.reply("you don't have an account")
                return
            }
            person = person.user
            if(config.commands[command].level_requirement > person.level){
                msg.reply(`you must be of level ${config.commands[command].level_requirement}, but you are only at level, ${person.level} `)
            }
            if(command == "balance"){
                let balance_result= await database.get_balance(msg.author.id,Person, msg_array[1])
                console.log(balance_result)
                if(!balance_result.success){
                    msg.reply(balance_result.msg)
                    return
                }
                msg.reply(balance_result.balance)

            }
            if(command == "create"){
                console.log("create")
                let result =  await database.create(msg.author.id,msg.author.username, Person)
                if(!result.success){
                    msg.reply(result.msg)
                    return
                }
                msg.reply(result.msg)
            }
            if(command == "help"){
                msg.reply(JSON.stringify(config.commands, null, 4))
            }
            if(command.startsWith( "start")){
                console.log("start")
                if(config.gang_name.test(msg_array[1])){
                    console.log(database.start_gang)
                    let result = await database.start_gang(msg.author.id, Person)
                    if(!result.success){
                        msg.reply(result.msg)
                    }else{
                        console.log(result)
                        let role = await msg.guild.roles.create({
                            data: {
                                name:msg_array[1] ,
                                color: 'BLUE',
                            }
                        })
                        msg.guild.member(msg.author).roles.add(role.id);
                        // Create a new channel with permission overwrites
                        msg.guild.channels.create(msg_array[1].toLowerCase(), {
                        type: 'text',
                        permissionOverwrites: [
                            {
                            id: msg.author.id,
                            allow: ['SEND_MESSAGES', "READ_MESSAGES"],
                            },
                        ],
                        })
                    }

                }else{
                    msg.reply("invalid gang name. must be /^[a-zA-Z0-9-]{2,14}$/")
                }
            }
            if(command == "profile"){
                let result = await database.find_person(msg.author.id,Person)
                if(result.success){
                    msg.reply(JSON.stringify(result.user,null,4))
                }
            }
            if(command == "extort"){
                let result = await database.extort(msg.author.id,Person)
                msg.reply(result.msg)
            }
            if(command.startsWith("make")){
                let result = await database.make(msg.author.id ,Person, msg_array[1])
                msg.reply(result.msg)
            }
            if(command =="market"){
               // let result = await database.get_market(Person,Offer)
                if(Offer.find({}).toString() =="" ){
                    msg.reply("no offers currently, put one up to see it here")
                }else{
                    let result = "\n"
                    for await (const doc of Offer.find()) {
                        result +=`Offer ${doc.short_id} : ${doc.amount} ${doc.item} for ${doc.cost}\n`
                    }
                   // console.log(Offer.find({}))
                    msg.reply(result)
                }
            }
            if(command.startsWith("sell")){
                let result = await database.sell(msg_array[1],msg_array[2] ,msg_array[3],person,Offer,Person)
                msg.reply(result.msg)
            }
            if(command.startsWith("accept")){
                let result = await database.accept(msg_array[1], person, Person, Offer)
            }
        }
    });



    client.login(process.env.DISCORD_BOT_SECRET);


})
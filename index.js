const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const line = require('@line/bot-sdk');
const app = express();
const ejs = require('ejs');
const http = require('http');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');

const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
}

const client = new line.Client(config);

const create = require('./routes/create');

app
  .use(express.static(path.join(__dirname,'public')))
  .set('views',path.join(__dirname,'views'))
  .set('view engine','ejs')
  .get('/',(req,res)=>res.render('pages/index'))
  .use('/create',create)
  .post('/hook/',line.middleware(config),(req,res)=> lineBot(req,res))
  .listen(PORT,()=>console.log(`Listening on ${PORT}`))

const lineBot = (req,res) => {
  res.status(200).end();
  const events = req.body.events;
  const promises = [];
  for(let i=0, l=events.length;i<l;i++){
    const ev = events[i];

    switch(ev.type){
      case 'join':
        promises.push(greeting_join(ev));
      
      case 'follow':
        promises.push(greeting_follow(ev));
      
      case 'message':
        promises.push(echoman(ev));
    }
  }
  Promise
    .all(promises)
    .then(console.log('pass'));
}

const echoman = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken,{
    type:'text',
    text:`${pro.displayName}さん、今「${ev.message.text}」って言いました？`
  });
}

const greeting_follow = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken,[
    {
      type:'text',
      text:`${pro.displayName}さん、こんにちは。調整くんです。\\n${pro.displayName}さんの代わりに僕がスケジュール調整するよ。`
    },
    {
      type:'text',
      text:'このリンクから依頼してね。'
    },
    {
      type:'text',
      text:'https://linebot-rdb.herokuapp.com/'
    }
  ]);
}

const greeting_join = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken,[
    {
      type:'text',
      text:`みなさんさん、こんにちは。調整くんです。\\n${pro.displayName}さんの代わりに僕がスケジュール調整するよ。`
    },
    {
      type:'text',
      text:'このリンクから依頼してね。'
    },
    {
      type:'text',
      text:'https://linebot-rdb.herokuapp.com/'
    }
  ]);
}
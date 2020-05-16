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
const request = require('request');

const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
}

const client = new line.Client(config);

const create = require('./routes/create');

var onetime_state_code;

const state_code = () => {
  const l = 8;
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const cl = c.length;
  let r = '';
  for (let i=0;i<l;i++){
    r+=c[Math.floor(Math.random()*cl)];
  }
  return r;
}

app
  .use(express.static(path.join(__dirname,'public')))
  .disable('etag')
  .set('views',path.join(__dirname,'views'))
  .set('view engine','ejs')
  .get('/',(req,res)=>res.render('pages/index'))
  .get('/login',(req,res)=>{
    onetime_state_code = state_code();
    const query = qs.stringify({
      response_type:'code',
      client_id:process.env.LINECORP_PLATFORM_CHANNEL_CHANNELID,
      redirect_uri:'https://linebot-rdb.herokuapp.com/callback',
      state:onetime_state_code,
      scope:'profile'
    })
    res.redirect(301,'https://access.line.me/oauth2/v2.1/authorize?'+query)
  })
  .get('/callback',(req,res)=>{
    const callback_state_code = req.query.state;
    if(onetime_state_code != callback_state_code){
      res.send('不正なアクセスです。');
    }else{
      request
      .post({
        url:'https://api.line.me/oauth2/v2.1/token',
        form:{
          grant_type:'authorization_code',
          code:req.query.code,
          redirect_uri:'https://linebot-rdb.herokuapp.com/callback',
          client_id:process.env.LINECORP_PLATFORM_CHANNEL_CHANNELID,
          client_secret:process.env.LINECORP_PLATFORM_CHANNEL_CHANNELSECRET
        }
      },(error,response,body)=>{
        if(response.statusCode != 200){
          res.send(error);
          return;
        }
        request
          .get({
            url:'https://api.line.me/v2/profile',
            headers:{
              'Authorization':'Bearer'+JSON.parse(body).access_token
            }
          },(error,response,body)=>{
            if(response.statusCode != 200){
              res.send(error);
              return;
            }
            res.send(body);
          })
      })
    }
  })
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
      text:`${pro.displayName}さん、こんにちは。調整くんです。\n${pro.displayName}さんの代わりに僕がスケジュール調整するよ。`
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
      text:`みなさんさん、こんにちは。調整くんです。\n${pro.displayName}さんの代わりに僕がスケジュール調整するよ。`
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
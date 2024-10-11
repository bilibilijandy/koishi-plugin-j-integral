import { Schema, Service, Context} from 'koishi'
import { Time, h } from "koishi"

export const name = "j-integral"
export const inject = {
  required: ['database'],  //必要服务
  optional: []   //可选服务
}
export const usage = "\n## \u7b80\u5355\u7684\u79ef\u5206\u7cfb\u7edf\n\n\u7b2c\u4e00\u6b21\u4f7f\u7528\u8bf7\u4f7f\u7528\u547d\u4ee4``\u6211\u662f\u4e3b\u4eba``\u8bbe\u7f6e\u7ba1\u7406\u5458\n";

//配置文件
export interface Config {
  SignInMax: number
  SignInMin: number
}
export const Config: Schema<Config> = Schema.object({
  SignInMax: Schema.number().default(1).description("签到时获得积分的最小数量(必填)"),
  SignInMin: Schema.number().default(10).description("签到时获得积分的最大数量(必填)"),
})

//数据库
export interface Users {
  ID: string,
  integral: string,
  grade: number,
  FinalSignin: string
}
export interface Config1 {  //别问我为啥加了个1，因为和上面Config冲突
  name: string,
  value: string,
}
declare module 'koishi' {
  interface Tables {
    users: Users
    config: Config1
  }
}

export async function apply(ctx: Context,config: Config){
  const logger = ctx.logger("j-integral")  //注册日志
  
  function mathRandomInt(a, b) {  //随机数函数
    if (a > b) {
      // 交换a和b以确保a较小。
      var c = a;
      a = b;
      b = c;
    }
    return Math.floor(Math.random() * (b - a + 1) + a);
  }
  
    //初始化
    logger.info('欢迎使用积分系统');
    logger.info('开始初始化');
    logger.info('开始初始化数据库');
    ctx.model.extend("users",{ID: "string", integral: "string", grade: "unsigned", FinalSignin: "string"},{primary: "ID"});
    logger.info('初始化users数据库成功');
    ctx.model.extend("config",{name: "string",  value: "string",},{primary: "name"});
    logger.info('初始化config数据库成功');
  
  ctx.middleware(async (session,next)=>{
    if ((((await ctx.database.get('users',{ID:([session.bot.sid,'.',session.userId].join(''))}))[0]?.ID)) == null) {
      ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',session.userId].join('')), integral: "0", grade: 0,}],['ID']);
      logger.info((['用户',[session.bot.sid,'.',session.userId].join(''),'注册成功'].join('')));
    }
    return next();
  })
  ctx.command('我是主人').action(async ({session},...args)=>{
    if ((((await ctx.database.get('config',{name: "owner"}))[0]?.value)) == null) {
      ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',session.userId].join('')), grade: 10,}],['ID']);
      ctx.database.upsert('config',[{name: "owner", value: "True",}],['name']);
      return (String(h('at',{ id: (session.userId) })) + '主人你好，欢迎使用积分系统');
    }
    return '权限不足';
  
  });
  
  ctx.command('我的信息').action(async ({session},...args)=>{
    await session.send(('ID：' + String(([session.bot.sid,'.',session.userId].join('')))));
    await session.send(('积分：' + String(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.integral))));
    return ('权限等级：' + String(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.grade)));
  
  });
  
  ctx.command('签到').action(async ({session},...args)=>{
    // 判断日期 
    if (Number((Time.template('yyyy',new Date((Math.round(Number(new Date()) )))))) >= Number(((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.FinalSignin)).slice(0, 4))) 
        && 
        Number((Time.template('MM',new Date((Math.round(Number(new Date()) )))))) >= Number(((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.FinalSignin)).slice(5, 7)))
        &&
        Number((Time.template('dd',new Date((Math.round(Number(new Date()) )))))) > Number(((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.FinalSignin)).slice(8, 10))))
        {
        let x = mathRandomInt(Number(config.SignInMax), Number(config.SignInMin));
        ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',session.userId].join('')), integral: String(Number(x)+Number(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.integral))),}],['ID']);
        ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',session.userId].join('')), FinalSignin: (Time.template('yyyy-MM-dd',new Date((Math.round(Number(new Date()) ))))),}],['ID']);
        return (['签到成功,获得',x,'积分'].join(''));
    }
    else {
      return '今天你已经签到过了！';
    }
  
  });
  
  ctx.command('管理.添加管理 <id>').action(async ({session},...args)=>{
    if ((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.grade)) >= 10) {
      ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join('')), grade: 10,}],['ID']);
      return '提交成功';
    }
    return '权限不足';
  
  });
  
  ctx.command('管理.给予积分 <id> <积分:number>').action(async ({session},...args)=>{
    if ((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.grade)) >= 10) {
      ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join('')), integral: String(args[1]+Number(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join(''))}))[0]?.integral))),}],['ID']);
      return '添加成功';
    }
    return '权限不足';
  
  });
  
  ctx.command('管理.扣除积分 <id> <积分:number>').action(async ({session},...args)=>{
    if ((((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.grade)) >= 10) {
      ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join('')), integral: String(Number(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join(''))}))[0]?.integral))-Number(args[1])),}],['ID']);
      return '扣除成功';
    }
    return '权限不足';
  
  });
  
  ctx.command('管理').action(async ({session},...args)=>{
    return null;
  
  });
  
  ctx.command('转账 <目标> <金额:number>').action(async ({session},...args)=>{
    ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join('')), integral: String(args[1]+Number(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',((args[0])).match(new RegExp("[1-9]([0-9]{5,11})", "g"))].join(''))}))[0]?.integral))),}],['ID']);
    ctx.database.upsert('users',[{ID: ([session.bot.sid,'.',session.userId].join('')), integral: String(Number(((await ctx.database.get('users',{ID: ([session.bot.sid,'.',session.userId].join(''))}))[0]?.integral))-Number(args[1])),}],['ID']);
    return '成功';
  });
}
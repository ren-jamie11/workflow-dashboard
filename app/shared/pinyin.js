/* Workflow Hub — pinyin for type-to-filter search, without a dictionary.
   Chrome / Edge sort Chinese by pinyin (Intl.Collator 'zh-CN'), so one boundary character per syllable is enough:
   a character's syllable is the one whose boundary is the last that sorts at or before it. This matches pypinyin for
   99.8% of the 3755 common characters (misses are polyphones read the other way, e.g. 地 → de). ü is written v.
   Table: first character of each syllable in Chrome's sort order (generated 2026-09-29, checked against pypinyin).
   pinyin.match(text, q) → true when q (letters) starts at a syllable of text's pinyin (shi, shim, shimu, mu)
                           or is part of its initials (sm) */
(function () {
'use strict';

const B = '阿哎安肮凹丷挀扳邦勹陂奔伻屄边灬憋汃冫癶峬嚓偲参仓撡冊嵾曽叉芆辿伥抄车抻阷吃充抽出欻揣巛刅吹旾逴呲匆凑粗汆崔邨搓咑呆丹当刀嘚扥灯氐甸刁爹丁丟东吺厾耑垖吨多妸诶奀鞥儿发帆匚飞分丰覅仏紑夫旮侅甘冈皋戈给根刯工勾估瓜乖关光归丨呙哈咍佄夯茠诃黒拫亨噷叿齁乎花怀欢巟灰昏吙丌加戋江杢阶巾坕冂丩凥姢噘军咔开刊忼尻匼肎劥空抠扝夸蒯宽匡亏坤扩垃来兰啷捞肋勒崚哩俩奁良簗毟拎伶溜囖龙瞜噜驴娈掠抡罗呣妈埋嫚牤猫嚒呅椚擝咪宀喵乜民名谬摸麿毪嗯拏腉囡囔孬疒娞恁能妮拈娘鸟捏囜宁妞农羺奴女奻疟黁郍喔讴妑拍眅乓抛呸喷匉丕囨剽氕姘乒钋剖仆七掐千呛悄苆亲靑芎丘区奍缺夋呥穣娆惹人扔日茸厹邚挼堧婑瞤捼仨毢三桒掻閪森僧杀筛山伤弰奢谁升尸収书刷衰闩双脽吮说厶忪凁苏狻夊孙唆他囼坍汤夲忑熥剔天旫帖厅囲偷凸湍推吞乇屲歪弯尣危昷翁挝乌夕虲仙乡灱些心星凶休吁吅削坃丫恹央幺倻一囙应哟佣优込囦曰晕帀災兂匨傮则贼怎増扎夈枬张佋蜇著凧之中州朱抓拽专妆隹宒卓乲宗邹租钻厜尊昨';
const S = 'a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo da dai dan dang dao de den deng di dian diao die ding diu dong dou du duan dui dun duo e ei en eng er fa fan fang fei fen feng fiao fo fou fu ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ha hai han hang hao he hei hen heng hm hong hou hu hua huai huan huang hui hun huo ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu lv luan lve lun luo m ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu n na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nv nuan nve nun nuo o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo sa sai san sang sao se sen seng sha shai shan shang shao she shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo'.split(' ');
const END = '兙';        // rare characters without a pinyin reading sort from here on
const C = new Intl.Collator('zh-CN');

function syllable(ch) {
  if (!/[\u4e00-\u9fa5]/.test(ch) || C.compare(ch, END) >= 0) return null;
  let lo = 0, hi = B.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (C.compare(ch, B[m]) >= 0) lo = m; else hi = m - 1;
  }
  return S[lo];
}

/* text → {full, starts, initials}: 实木 → {full:'shimu', starts:[0,3], initials:'sm'}; other characters kept as they are */
const cache = new Map();
function of(text) {
  const key = String(text);
  if (cache.has(key)) return cache.get(key);
  let full = '', initials = '';
  const starts = [];
  for (const ch of key.toLowerCase()) {
    if (/\s/.test(ch)) continue;
    const s = syllable(ch) || ch;
    starts.push(full.length);
    full += s;
    initials += s[0];
  }
  const r = { full, starts, initials };
  cache.set(key, r);
  return r;
}

function match(text, q) {
  q = String(q).toLowerCase().replace(/\s+/g, '');
  if (!q || !/^[a-z]+$/.test(q)) return false;
  const p = of(text);
  return p.initials.includes(q) || p.starts.some(i => p.full.startsWith(q, i));
}

window.pinyin = { syllable, of, match };
})();

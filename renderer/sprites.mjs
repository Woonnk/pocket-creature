// Each look shares the actor's face and joint positions, keeping existing poses intact.
export const SPRITES=Object.freeze([
  {id:'original',name:'Original',description:'Your familiar little dragon.'},
  {id:'cloud',name:'Cloud Drake',description:'Fluffy cheeks, soft wings, a cloud-tipped tail.'},
  {id:'night',name:'Night Wyvern',description:'Swept horns, pointed wings, a spade tail.'},
  {id:'river',name:'River Dragon',description:'Fan-shaped frills, flowing fins, a curled tail.'},
]);
export function normalizeSprite(value){return SPRITES.some(s=>s.id===value)?value:'original';}
// Only geometry changes. No scripts, URLs, selectors or user-supplied markup.
export const SPRITE_GEOMETRY=Object.freeze({
  cloud:{
    tail:{d:'M154 169Q178 191 195 175Q187 170 192 161Q195 153 204 158Q206 144 218 151Q233 146 233 158Q237 169 230 177Q231 191 216 190Q207 201 197 187Q176 202 157 190Z'},
    'tail-tip':{d:'M199 167Q201 157 209 165Q213 154 220 161Q230 156 229 167Q239 173 226 177Q224 187 216 180Q205 187 205 177Q197 177 199 167Z'},
    wing:{d:'M149 133Q154 116 167 120Q160 103 174 98Q177 89 185 94Q197 90 197 102Q214 104 209 116Q218 128 204 135Q202 150 187 148Q167 162 149 145Z'},
    'wing-veins':{d:'M158 141Q176 133 191 105M162 142Q180 146 200 128'},
    body:{d:'M83 111Q143 102 167 135Q180 138 177 153Q190 169 178 181Q179 199 161 197Q150 206 136 196Q116 206 102 196Q82 201 77 185Q61 177 72 159Q63 143 79 134Z'},
    'horn-left':{d:'M94 73Q85 60 86 44Q84 31 95 33Q105 33 102 44Q98 56 114 66Z'},
    'horn-right':{d:'M133 66Q145 57 144 42Q139 28 150 28Q166 28 160 45Q158 60 153 77Z'},
    head:{d:'M76 73Q78 58 95 62Q114 48 131 59Q149 52 159 69Q178 69 177 88Q187 99 172 112Q177 127 160 130Q151 146 134 137Q115 147 101 138Q79 145 72 129Q51 124 59 108Q47 91 64 85Q61 74 76 73Z'},
    ear:{d:'M160 78Q178 68 187 76Q194 86 183 91Q182 103 169 98'},
    highlight:{d:'M69 94Q62 78 79 77Q81 67 95 70Q108 60 119 65Q87 69 77 96Z'},
    detail:{d:'M100 170Q105 164 110 170Q115 164 120 170Q125 164 130 170'},
    'face-detail':{d:'M72 119l4-2m69 4 5-2'},
  },
  night:{
    tail:{d:'M151 170Q183 190 199 176Q211 165 211 145L206 143L221 127L232 144L224 144Q224 180 202 189Q178 200 153 185Z'},
    'tail-tip':{d:'M217 145l4-12 6 10-7-2Z'},
    wing:{d:'M145 133Q160 104 163 75L178 89L202 64L197 101L225 107L199 121L202 145L180 136L166 151Z'},
    'wing-veins':{d:'M155 141L197 79M158 141L211 108M161 142L194 132'},
    body:{d:'M90 111Q146 99 165 132L179 161Q187 187 151 196L104 194Q78 190 77 164Z'},
    'horn-left':{d:'M94 73Q82 58 74 25Q95 36 107 64Z'},
    'horn-right':{d:'M134 65Q151 44 169 21Q170 48 154 79Z'},
    head:{d:'M78 71L109 57L143 62L164 78Q175 94 164 118L147 133Q125 143 96 134L71 119Q56 101 65 84Z'},
    ear:{d:'M157 78L190 57L180 91L165 101Z'},
    highlight:{d:'M70 90L82 76L105 65L88 81L77 100Z'},
    detail:{d:'M143 149l7-4 7 4m-15 12 7-4 7 4m-17 12 7-4 7 4'},
    'face-detail':{d:'M109 70l5 8 5-8m-43 40 3 5m71-9-3 5'},
    belly:{rx:'23',ry:'32'},
  },
  river:{
    tail:{d:'M151 169Q192 190 218 164Q234 146 220 121Q214 111 206 120Q197 130 209 136Q216 142 208 155Q191 172 174 152Z'},
    'tail-tip':{d:'M214 138Q194 141 194 129L203 130L202 115Q216 105 223 116L216 125L233 125L227 138Z'},
    wing:{d:'M146 134Q152 121 161 111L156 91Q175 92 188 103L203 99L198 117L208 125L192 130L189 145L171 145L159 155Z'},
    'wing-veins':{d:'M155 141L162 102M158 141L184 110M160 141L195 123'},
    body:{d:'M80 116Q130 97 158 125Q178 143 177 168Q180 196 148 198L102 194Q74 185 72 155Z'},
    'horn-left':{d:'M94 73L79 66L66 49L87 52L86 35L108 57L116 67Z'},
    'horn-right':{d:'M134 65L146 43L157 29L160 51L178 45L161 72L151 81Z'},
    head:{d:'M81 70Q116 53 148 68Q169 77 170 99L178 111Q179 132 151 137Q116 150 79 130Q56 115 62 95Q63 82 81 70Z'},
    ear:{d:'M160 80L185 67L182 82L197 85L183 96L187 108L165 100Z'},
    highlight:{d:'M70 92Q77 73 102 72Q85 79 78 98Z'},
    detail:{d:'M151 148q10 3 7 11m-12 4q10 3 7 11m-13 3q10 3 7 11'},
    'face-detail':{d:'M70 109l6 3m-6 4 6 2m79-10-6 3m7 5-6 2'},
    belly:{rx:'26',ry:'35'},
  },
});
const originals=new WeakMap();
const geometryAttributes=['d','cx','cy','rx','ry'];
export function applySprite(svg,value){
  const id=normalizeSprite(value);
  if(!originals.has(svg))originals.set(svg,[...svg.querySelectorAll('[data-sprite-part]')].map(node=>({node,part:node.dataset.spritePart,attributes:Object.fromEntries(geometryAttributes.map(key=>[key,node.getAttribute(key)]))})));
  for(const {node,part,attributes} of originals.get(svg)){
    for(const [key,original] of Object.entries(attributes)){
      const next=SPRITE_GEOMETRY[id]?.[part]?.[key]??original;
      if(next===null)node.removeAttribute(key);else if(node.getAttribute(key)!==next)node.setAttribute(key,next);
    }
  }
  svg.dataset.sprite=id;
  return id;
}

import mermaid from 'mermaid';
mermaid.initialize({startOnLoad:false,securityLevel:'strict',htmlLabels:false,maxTextSize:50000,suppressErrorRendering:true,theme:'base',fontFamily:'Manrope, sans-serif',flowchart:{htmlLabels:false},themeVariables:{primaryColor:'#efdeed',primaryTextColor:'#361d35',primaryBorderColor:'#b19bab',lineColor:'#92798b',secondaryColor:'#f9e6b6',tertiaryColor:'#fffdf7'}});
let sequence=0;
export async function render(source){const {svg}=await mermaid.render(`hustle-diagram-${++sequence}`,source);return svg;}

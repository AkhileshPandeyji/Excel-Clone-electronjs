const $ = require("jquery");
const dialog = require("electron").remote.dialog;
const AES = require("crypto-js/aes")
const fs = require("fs");
let db = [];
let text_alignm = "left";

$(document).ready(function () {
    $(".col").on("click", function () {
        let ri = Number($(this).attr("ri"));
        let ci = Number($(this).attr("ci"));
        let colChar = String.fromCharCode(65 + ci);
        $("#address").val(colChar + ri);
    });

    $("#formula").on("input", function () {
        let addr = $("#address").val();
        let formula = $("#formula").val();
        let colChar = addr.charAt(0);
        let ri = Number(addr.substring(1, addr.length));
        let ci = colChar.charCodeAt() - 65;
        let gridcols = $(".grid .col");
        for (let i = 0; i < gridcols.length; i++) {
            let gridcol = gridcols[i];
            if (gridcol.getAttribute("ri") == ri && gridcol.getAttribute("ci") == ci) {
                gridcol.innerText = formula;
            }
        }
    });

    $(".menu-items").on("click", function () {
        $(".menu-options-items").removeClass("selected");
        let id = $(this).attr("id");
        $(`#${id}-options`).addClass("selected");
    });

    $("#new").on("click", function () {
        db = [];
        $(".grid").find(".row").each(function () {
            let row = [];
            $(this).find(".col").each(function () {
                let cell = {
                    value:"",
                    formula:"",
                    downstream:[],
                    upstream:[],
                    font_family:"Arial",
                    font_size:"14",
                    is_underlined:false,
                    is_italics:false,
                    is_bold:false,
                    back_col:"#ffffff",
                    front_col:"#000000",
                    text_align:"left"                    
                }
                $(this).html(cell.value);
                $(this).css("font-family",cell.font_family);
                $(this).css("font-size",cell.font_size+"px");
                $(this).css("text-decoration",(cell.is_underlined)?"underline":"none");
                $(this).css("font-style",(cell.is_italics)?"italic":"normal");
                $(this).css("font-weight",(cell.is_bold)?"bold":"normal");
                $(this).css("background",cell.back_col);
                $(this).css("color",cell.front_col);
                $(this).css("text-align",cell.text_align);
                row.push(cell);
            });
            db.push(row);
        });
        $("#font-name").val("Arial");
        $("#font-size").val("14");
        $("#font-color-back").val("#ffffff");
        $("#font-color-front").val("#000000");
        $("#left-align-btn").removeClass("highlighted");
        $("#center-align-btn").removeClass("highlighted");
        $("#right-align-btn").removeClass("highlighted");
        $("#bold-btn").removeClass("highlighted");
        $("#italics-btn").removeClass("highlighted");
        $("#underline-btn").removeClass("highlighted");
    });

    $('#open').on("click", async function () {
        $("#new").trigger("click");
        let ofd = await dialog.showOpenDialog();
        let value = await fs.promises.readFile(ofd.filePaths[0]);
        // value = AES.decrypt(value,"AKP");
        let data = JSON.parse(value);
        $(".grid").find(".row").each(function () {
            $(this).find(".col").each(function () {
                let ri = Number($(this).attr("ri")) - 1;
                let ci = Number($(this).attr("ci"));
                let cellObj = data[ri][ci];
                db[ri][ci] = data[ri][ci];
                $(this).html(cellObj.value);
                $(this).css("font-family",cellObj.font_family);
                $(this).css("font-size",cellObj.font_size+"px");
                $(this).css("text-decoration",(cellObj.is_underlined)?"underline":"none");
                $(this).css("font-style",(cellObj.is_italics)?"italic":"normal");
                $(this).css("font-weight",(cellObj.is_bold)?"bold":"normal");
                $(this).css("background",cellObj.back_col);
                $(this).css("color",cellObj.front_col);
                $(this).css("text-align",cellObj.text_align);
            })
        });
    });

    $("#save").on("click", async function () {
        let fsd = await dialog.showSaveDialog();
        let data = JSON.stringify(db);
        // data = AES.encrypt(data,"AKP");
        await fs.promises.writeFile(fsd.filePath, data);
    });

    $("#formula").on("blur",function(){
        let addressVal = $("#address").val();
        let formula = $(this).val();
        let { rid,cid } = getRCFromAddress(addressVal);
        let evaluatedVal = evaluate(formula);
        let cellObj = getCellObjFromRC(rid,cid);  
        if(formula === cellObj.formula){
            updateValue(rid,cid,evaluatedVal,cellObj);
            return;
        }   
        if(!validate(formula)){
            cellObj.formula = formula;
            removeFormula(rid,cid,cellObj);
            $(`.grid .col[ri="${rid+1}"][ci="${cid}"]`).html(""+cellObj.value);
            $(this).val("");
            dialog.showErrorBox("Invalid Formula","Type Some Valid Formula");
            return;
        }
        if(formula !== cellObj.formula && cellObj.formula !== ""){            
            cellObj.formula = formula;
            removeFormula(rid,cid,cellObj);
        }
        cellObj.formula = formula;
        setupFormula(rid,cid,cellObj,formula);
        updateValue(rid,cid,evaluatedVal,cellObj);
        $(this).val("");
        // console.log(cellObj);
    });

    $(".grid .col").on("blur",function(){
        let rid = Number($(this).attr("ri"))-1;
        let cid = Number($(this).attr("ci"));
        let cellObj = getCellObjFromRC(rid,cid);
        // console.log($(this).html());
        // console.log(db[rid][cid].value);
        if($(this).html() == db[rid][cid].value){
            return;
        }
        if($(this).html().trim() == ""){
            //downstream removal + upstream removal
            return;
        }
        if(cellObj.formula !== ""){
            removeFormula(rid,cid,cellObj);
        }
        updateValue(rid,cid,$(this).html(),cellObj)
    });

    $(".grid .row .col").on("click",function(){
        let val = $("#address").val();
        let row = Number(val.substring(1,val.length))-1;
        let col = val.charCodeAt(0)-65;
        let cellObj = getCellObjFromRC(row,col);
        // console.log(cellObj);
        $("#font-name").val(cellObj.font_family);
        $("#font-size").val(cellObj.font_size);
        $("#font-color-back").val(cellObj.back_col);
        $("font-color-front").val(cellObj.front_col);
        if(cellObj.is_underlined){
            if($("#underline-btn").hasClass("highlighted") == false){
                $("#underline-btn").addClass("highlighted");
            }
        }
        else{
            if($("#underline-btn").hasClass("highlighted")){
                $("#underline-btn").removeClass("highlighted");
            }
        }
        if(cellObj.is_italics){
            if($("#italics-btn").hasClass("highlighted") == false){
                $("#italics-btn").addClass("highlighted");
            }
        }
        else{
            if($("#italics-btn").hasClass("highlighted")){
                $("#italics-btn").removeClass("highlighted");
            }
        }
        if(cellObj.is_bold){
            if($("#bold-btn").hasClass("highlighted") == false){
                $("#bold-btn").addClass("highlighted");
            }
        }
        else{
            if($("#bold-btn").hasClass("highlighted")){
                $("#bold-btn").removeClass("highlighted");
            }
        }
        if(cellObj.text_align == "left"){
            if($("#left-align-btn").hasClass("highlighted") == false){
                $("#left-align-btn").addClass("highlighted");
                if($("#right-align-btn").hasClass("highlighted")){
                    $("#right-align-btn").removeClass("highlighted");
                }
                if($("#center-align-btn").hasClass("highlighted")){
                    $("#center-align-btn").removeClass("highlighted");
                }
            }

        }
        else if(cellObj.text_align == "right"){
            if($("#right-align-btn").hasClass("highlighted") == false){
                $("#right-align-btn").addClass("highlighted");
                if($("#left-align-btn").hasClass("highlighted")){
                    $("#left-align-btn").removeClass("highlighted");
                }
                if($("#center-align-btn").hasClass("highlighted")){
                    $("#center-align-btn").removeClass("highlighted");
                }
            }
        }
        else{
            if($("#center-align-btn").hasClass("highlighted") == false){
                $("#center-align-btn").addClass("highlighted");
                if($("#right-align-btn").hasClass("highlighted")){
                    $("#right-align-btn").removeClass("highlighted");
                }
                if($("#left-align-btn").hasClass("highlighted")){
                    $("#left-align-btn").removeClass("highlighted");
                }
            }
        }
    });

    $(".cells-container").on("scroll",function(){
        let scrollX = $(this).scrollLeft();
        let scrollY = $(this).scrollTop();
        $("#top-left-cell,#top-row").css("top",scrollY);
        $("#top-left-cell,#left-col").css("left",scrollX);
    });

    $("#font-name").on("change",function(){
        let val = $("#address").val();
        // console.log(val);
        let font_name = $(this).val();
        // console.log(font_name);
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.font_family=font_name;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-family",font_name);
    });

    $("#font-size").on("change",function(){
        let val = $("#address").val();
        // console.log(val);
        let font_siz  = $(this).val();
        // console.log(font_siz);
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.font_size=font_siz;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-size",font_siz+"px");
    })

    $("#font-color-back").on("change",function(){
        let val = $("#address").val();
        // console.log(val);
        let font_col_back  = $(this).val();
        // console.log(font_col_back);
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.back_col=font_col_back;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("background",font_col_back);
    });

    $("#font-color-front").on("change",function(){
        let val = $("#address").val();
        // console.log(val);
        let font_col_front  = $(this).val();
        // console.log(font_col_front);
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.front_col=font_col_front;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("color",font_col_front);
    });

    $("#left-align-btn").on("click",function(){
        $(this).toggleClass("highlighted");
        if($("#center-align-btn").hasClass("highlighted")){
            $("#center-align-btn").removeClass("highlighted"); 
        }
        if($("#right-align-btn").hasClass("highlighted")){
            $("#right-align-btn").removeClass("highlighted");
        }    
        text_alignm = "left";
        let val = $("#address").val();
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.text_align = text_alignm;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("text-align",text_alignm);   
        
    });

    $("#center-align-btn").on("click",function(){
        $(this).toggleClass("highlighted");
        if($("#left-align-btn").hasClass("highlighted")){
            $("#left-align-btn").removeClass("highlighted");
        }
        if($("#right-align-btn").hasClass("highlighted")){
            $("#right-align-btn").removeClass("highlighted");
        } 
        text_alignm = "center";
        let val = $("#address").val();
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.text_align = text_alignm;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("text-align",text_alignm);

    });
    
    $("#right-align-btn").on("click",function(){
        $(this).toggleClass("highlighted");
        if($("#left-align-btn").hasClass("highlighted")){
            $("#left-align-btn").removeClass("highlighted");
        }
        if($("#center-align-btn").hasClass("highlighted")){
            $("#center-align-btn").removeClass("highlighted"); 
        }
        text_alignm = "right";
        let val = $("#address").val();
        let col = val.substring(0,1).charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        cellObj.text_align = text_alignm;
        $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("text-align",text_alignm);
    });
    
    $("#bold-btn").on("click",function(){
        let val = $("#address").val();
        let col = val.charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        $(this).toggleClass("highlighted");
        if($(this).hasClass("highlighted")){
            cellObj.is_bold = true;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-weight","bold");
        }
        else{
            cellObj.is_bold = false;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-weight","normal");
        }
    });
    
    $("#italics-btn").on("click",function(){
        let val = $("#address").val();
        let col = val.charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        $(this).toggleClass("highlighted");
        if($(this).hasClass("highlighted")){
            cellObj.is_italics = true;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-style","italic");
        }
        else{
            cellObj.is_italics = false;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("font-style","normal");
        }
    });
    
    $("#underline-btn").on("click",function(){
        let val = $("#address").val();
        let col = val.charCodeAt(0)-65;
        let row = Number(val.substring(1,val.length))-1;
        let cellObj = getCellObjFromRC(row,col);
        $(this).toggleClass("highlighted");
        if($(this).hasClass("highlighted")){
            cellObj.is_underlined = true;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("text-decoration","underline");
        }
        else{
            cellObj.is_underlined = false;
            $(`.grid .row .col[ri="${row+1}"][ci="${col}"]`).css("text-decoration","none");
        }
    });



    function evaluate(formula){
        // console.log(formula);
        let formulaComponent = formula.split(" ");
        // console.log(formulaComponent);
        for(let i=0;i<formulaComponent.length;i++){
            let formulaComp = formulaComponent[i];
            let code = formulaComponent[i].charCodeAt(0);
            // console.log(code);
            if(code>=65 && code<=90){
                let fparent = getRCFromAddress(formulaComponent[i]);
                // console.log(fparent);
                let val = db[fparent.rid][fparent.cid].value;
                // console.log(val);
                // console.log(formulaComp);
                formula = formula.replace(formulaComp,val);
            }
        }
        // console.log(formula);
        let evalVal = eval(formula);
        // console.log(evalVal);
        return evalVal;
    }

    function setupFormula(rid,cid,cellObj,formula){
        let formulaComponent = formula.split(" ");
        for(let i=0;i<formulaComponent.length;i++){
            let code = formulaComponent[i].charCodeAt(0);
            if(code>=65 && code<=90){
                let parentrid = Number(formulaComponent[i].substring(1,formulaComponent[i].length))-1;
                let parentcid = code - 65;
                let parentCellObj = getCellObjFromRC(parentrid,parentcid);
                parentCellObj.downstream.push({
                    rid,
                    cid
                });
                cellObj.upstream.push({
                    rid:parentrid,
                    cid:parentcid
                });
                // console.log(parentCellObj);
            }
        }
    }
    function validate(formula){
        let formulaComponent = formula.split(" ");
        for(let i=0;i<formulaComponent.length;i++){
            let code = formulaComponent[i].charCodeAt(0);
            if(code>=65 && code<=90)
            {
                return true;
            }
        }
        return false;
    }

    function removeFormula(rid,cid,cellObj){
        for(let i=0;i<cellObj.upstream.length;i++){
            let prid = cellObj.upstream[i].rid;
            let pcid = cellObj.upstream[i].cid;
            let pObj = getCellObjFromRC(prid,pcid);
            pObj.downstream = pObj.downstream.filter(function(rc){
                if(rc.rid == rid && rc.cid == cid){
                    return false;
                }
                else{
                    return true;
                }
            });
            // console.log(va);
        }
        
    }

    function updateValue(rid,cid,evaluatedVal,cellObj){
        // console.log(rid+":"+cid);
        $(`.grid .col[ri="${rid+1}"][ci="${cid}"]`).html(""+evaluatedVal);
        cellObj.value = ""+ evaluatedVal;
        // console.log(cellObj);
        for(let i=0;i<cellObj.downstream.length;i++){
            let childrid = cellObj.downstream[i].rid;
            let childcid = cellObj.downstream[i].cid;
            // console.log(childrid+":"+childcid);
            let childObj = getCellObjFromRC(childrid,childcid);
            let evalVal = evaluate(childObj.formula);
            updateValue(childrid,childcid,evalVal,childObj);            
        }
    }

    function getRCFromAddress(addressVal){
        let rid = Number(addressVal.substring(1,addressVal.length))-1;
        let cid = addressVal.charCodeAt(0)-65;
        return {
            rid,
            cid
        }
    }
    function getCellObjFromRC(rid,cid){
        return db[rid][cid];
    }

    function init() {
        $("#file").trigger("click");
        $("#new").trigger("click");
    }
    init();
});



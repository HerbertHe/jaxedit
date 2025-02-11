/* JaxEdit: online LaTeX editor with live preview
 * Copyright (c) 2011-2017 JaxEdit project
 * License: The MIT License
 * Source:  https://github.com/zohooo/jaxedit
 */

if (!window.console) console = { log: function () {} }

window.typejax = (function ($) {
    // TODO: typejax对象
    var typejax = {
        totaltext: "", // 总文本
        totalsize: 0, // 总大小
        raw: "", // 原始
        rawsize: 0, // 原始大小
        totaldata: [], // 总数据
        totalsect: [], // 总章节
        innersect: [], // 内部章节？
    }

    // TODO: updater对象
    typejax.updater = {
        typemode: "full", // 输入模式
        thequeue: [], // 队列
        thehooks: {}, // 钩子
        isRunning: false, // 是否正在运行？
        showarea: null, // showarea？

        // TODO: init初始化
        init: function (newtext, newsize, showarea) {
            this.thequeue = []
            MathJax.Hub.Queue([
                typejax,
                function () {
                    this.totaltext = ""
                    this.totalsize = 0
                    this.totaldata = []
                    this.totalsect = []
                    showarea.innerHTML = ""
                    this.updater.putTask(0, 0, "", newtext, newsize, showarea)
                },
            ])
        },

        // TODO: 初始化模式
        initMode: function (mode) {
            var that = typejax
            this.typemode = mode
            var config = MathJax.Hub.config
            if (mode == "tiny") {
                config.tex2jax = {
                    inlineMath: [
                        ["$", "$"],
                        ["(", ")"],
                    ],
                    processEnvironments: false,
                }
            } else {
                config.tex2jax = {
                    inlineMath: [["(", ")"]],
                    processEnvironments: true,
                }
            }
            this.init(that.totaltext, that.totalsize, this.showarea)
        },

        // 在队列中
        inQueue: function (
            delstart,
            delend,
            deltext,
            instext,
            newsize,
            showarea
        ) {
            MathJax.Hub.Queue([
                typejax,
                function () {
                    this.updater.putTask(
                        delstart,
                        delend,
                        deltext,
                        instext,
                        newsize,
                        showarea
                    )
                },
            ])
        },

        putTask: function (
            delstart,
            delend,
            deltext,
            instext,
            newsize,
            showarea
        ) {
            if (deltext == "" && instext == "") return
            this.showarea = showarea
            this.thequeue.push([delstart, delend, deltext, instext, newsize])
            if (!this.isRunning) {
                this.isRunning = true
                this.getTask()
            }
        },

        getTask: function () {
            var localtext = typejax.totaltext,
                localsize = typejax.totalsize
            var task = []
            var delstart, delend, deltext, instext, newsize
            var localhead = localsize,
                localtail = localsize
            var oldsize = localsize
            while (this.thequeue.length > 0) {
                task = this.thequeue.shift()
                delstart = task[0]
                delend = task[1]
                deltext = task[2]
                instext = task[3]
                newsize = task[4]
                if (deltext != localtext.substring(delstart, delend))
                    alert("text content is wrong!")
                localhead = delstart < localhead ? delstart : localhead
                localtail =
                    localsize - delend < localtail
                        ? localsize - delend
                        : localtail
                localtext =
                    localtext.substring(0, delstart) +
                    instext +
                    localtext.substring(delend, localsize)
                localsize = newsize
                delstart = localhead
                delend = oldsize - localtail
                instext = localtext.substring(localhead, localsize - localtail)
                if (localsize != localtext.length) alert("text size is wrong!")
            }
            //console.log("delstart:", delstart, "delend:", delend, "inssize:", instext.length, "newsize:", newsize);
            typejax.totaltext = localtext
            typejax.totalsize = localsize
            this.runTask(delstart, delend, instext.length)
        },

        runTask: function (delstart, delend, inssize) {
            var bridge = typejax.bridge
            if (this.typemode == "tiny") {
                bridge.typeTiny(delstart, delend, inssize)
            } else {
                var r = bridge.expandMacros(delstart, delend, inssize)
                bridge.typeFull(r.delStart, r.delEnd, r.insSize)
            }
        },

        addHook: function (type, scope, fn) {
            var hooks = this.thehooks[type],
                back = [scope, fn]
            if (hooks) {
                hooks.push(back)
            } else {
                this.thehooks[type] = [back]
            }
        },

        runHooks: function (type) {
            var hooks = this.thehooks[type],
                args = [].slice.call(arguments, 1, arguments.length)
            if (!hooks) return
            for (var i = 0; i < hooks.length; i++) {
                MathJax.Hub.Queue(hooks[i].concat(args))
            }
        },

        updateTiny: function (output, isAll) {
            var showarea = this.showarea
            showarea.innerHTML = output
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, showarea]) // Process or Typeset
            this.runHooks("After Typeset Tiny", isAll)
            MathJax.Hub.Queue(["afterTypeset", typejax.updater])
        },

        updateFull: function (change) {
            var that = this,
                showarea = this.showarea,
                olddiv = change.olddiv,
                newdiv = change.newdiv,
                start = change.start,
                end = change.end

            if (olddiv.length && newdiv.length) compareDiv()
            else changeAll()

            MathJax.Hub.Queue(["Process", MathJax.Hub, showarea])
            that.runHooks("After Typeset Full", start, end, newdiv)
            MathJax.Hub.Queue(["afterTypeset", typejax.updater])

            function compareDiv() {
                var modsize =
                    newdiv[newdiv.length - 1].to - olddiv[olddiv.length - 1].to
                // console.log(olddiv.length, newdiv.length, modsize);
                var idx = start,
                    exist,
                    ndiv,
                    odiv,
                    nFrom,
                    nTo,
                    oFrom,
                    oTo,
                    min,
                    max,
                    i,
                    k,
                    a = 0,
                    b = 0
                for (i = 0; i < newdiv.length; i++) {
                    ndiv = newdiv[i]
                    nFrom = ndiv.from
                    nTo = ndiv.to
                    exist = false
                    for (k = a = b; k < olddiv.length; k++) {
                        odiv = olddiv[k]
                        oFrom = odiv.from
                        oTo = odiv.to
                        min = oFrom + Math.min(0, modsize)
                        max = oTo + Math.max(0, modsize)
                        if (max < nTo) continue
                        if (min > nFrom) break
                        if (
                            oTo - oFrom == nTo - nFrom &&
                            odiv.name == ndiv.name &&
                            odiv.html == ndiv.html
                        ) {
                            b = k
                            exist = true
                            break
                        }
                    }
                    if (!exist) {
                        for (k = a; k < olddiv.length; k++) {
                            odiv = olddiv[k]
                            oFrom = odiv.from
                            oTo = odiv.to
                            if (oTo + modsize <= nTo) b++
                            else if (oFrom + modsize > nTo) break
                        }
                    }
                    for (k = a; k < b; k++) {
                        typejax.message.log("update", "\t\t", "delete", k)
                        removeDiv(idx)
                    }
                    if (exist) {
                        typejax.message.log("update", "\t\t", "omit", b)
                        typejax.message.log("update", "remain", i)
                        b++
                        idx++
                    } else {
                        typejax.message.log("update", "insert", i)
                        insertDiv(idx++, i)
                    }
                }
            }

            function removeDiv(idx) {
                showarea.removeChild(showarea.childNodes[idx])
            }

            function insertDiv(idx, i) {
                node = document.createElement("div")
                data = newdiv[i]
                node.className = "envblock " + data.name
                if (data.reset)
                    node.style.cssText = "counter-reset:" + data.reset + ";"
                node.innerHTML = data.html
                showarea.insertBefore(node, showarea.childNodes[idx] || null)
            }

            function changeAll() {
                var output = "",
                    data = "",
                    style
                for (var i = 0; i < newdiv.length; i++) {
                    data = newdiv[i]
                    style = data.reset
                        ? " style='counter-reset:" + data.reset + ";'"
                        : ""
                    output +=
                        "<div class='envblock " +
                        data.name +
                        "'" +
                        style +
                        ">" +
                        data.html +
                        "</div>"
                }
                showarea.innerHTML = output
            }
        },

        afterTypeset: function () {
            if (this.thequeue.length > 0) this.getTask()
            this.isRunning = false
        },
    }

    // TODO: bridge对象
    typejax.bridge = {
        // 宏
        macros: {},

        // TODO: 拓展宏
        expandMacros: function (delStart, delEnd, insSize) {
            function nestBrackets(level) {
                var level = level || 5,
                    re = (c =
                        "(?:[^\\r\\n\\{\\}]|\\\\[\\{\\}]|\\r?\\n(?!\\r?\\n))*?")
                while (level--) re = c + "(?:\\{" + re + "}" + c + ")*?"
                return " *(\\{" + re + "\\}|[^\\{])"
            }

            function getRegExp(name, macro) {
                var num = macro.num,
                    def = macro.def,
                    re = ""
                while (num--) re += nestBrackets()
                re = "\\" + name + "(?![a-zA-Z\\}])" + re
                return new RegExp(re, "g")
            }

            function trimString(s) {
                return s.replace(/^ +| +$/g, "").replace(/^\{|\}$/g, "")
            }

            function mergeMaps(map, mapx) {
                var itemx, item, n, k
                for (n = 0; n < mapx.length; n++) {
                    ;(itemx = mapx[n]), (k = 0)
                    while ((item = map[k])) {
                        if (item[0] < itemx[0]) {
                            itemx[0] -= item[2] - item[1]
                            k++
                        } else {
                            break
                        }
                    }
                }
                $.each(mapx, function (k, v) {
                    if (v[3]) v[3].idx = v[0]
                    v.length = 3
                })
                map = map.concat(mapx).sort(function (a, b) {
                    return a[0] - b[0]
                })
                //console.log(map);
                return map
            }

            function updateSizes(start, minus, plus, macro) {
                var end = start + minus,
                    size = plus - minus
                mapx.push([start, minus, plus, macro])
                if (changed) return
                typejax.message.log(
                    "macro",
                    "head",
                    head,
                    "tail",
                    tail,
                    "start",
                    start,
                    "end",
                    end
                )
                if (end < insStart) {
                    size1 += size
                } else if (insEnd < start) {
                    size2 += size
                } else {
                    //console.log("shrink head or tail");
                    head = Math.min(head, start)
                    tail = Math.min(tail, raw.length - end)
                }
            }

            function doReplace(re, replacer) {
                mapx = []
                if (!changed) {
                    ;(insStart = head),
                        (insEnd = raw.length - tail),
                        (size1 = size2 = 0)
                }
                raw = raw.replace(re, replacer)
                if (!changed) {
                    head += size1
                    tail += size2
                    typejax.message.log("macro", "head", head, "tail", tail)
                }
                map = mergeMaps(map, mapx)
            }

            function checkMacros() {
                changed = false
                $.each(that.macros, function (name, m) {
                    var start = m.idx,
                        end = start + m.len
                    if (!(end < delStart || delEnd < start)) {
                        changed = true
                        //break;
                    }
                })
                if (changed) head = tail = 0
            }

            function updateMacros() {
                $.each(macros, function (name) {
                    if (!that.macros[name]) {
                        changed = true
                        head = tail = 0
                    }
                })
                that.macros = macros
            }

            function extractMacros() {
                var cs = "\\\\\\w+",
                    re
                // \def, \gdef, \edef and \xdef
                re = new RegExp(
                    "\\\\[gex]?def\\*? *(" + cs + ") *(#\\d)*" + nestBrackets(),
                    "g"
                )
                doReplace(re, function (match) {
                    var m = arguments,
                        start = m[m.length - 2],
                        end = start + match.length
                    var macro = {
                        idx: start,
                        len: m[0].length,
                        num: m[2] ? Math.min(m[2].length / 2, 9) : 0,
                        def: trimString(m[3]),
                    }
                    macros[trimString(m[1])] = macro
                    updateSizes(start, match.length, 0, macro)
                    return ""
                })
                // \newcommand, \newcommand*, \renewcommand and \renewcommand*
                re = new RegExp(
                    "\\\\(?:re)?newcommand\\*? *(" +
                        cs +
                        "|\\{" +
                        cs +
                        "}) *(\\[(\\d)\\])?" +
                        nestBrackets(),
                    "g"
                )
                doReplace(re, function (match) {
                    var m = arguments,
                        start = m[m.length - 2],
                        end = start + match.length
                    var macro = {
                        idx: start,
                        len: m[0].length,
                        num: m[3] || 0,
                        def: trimString(m[4]),
                    }
                    macros[trimString(m[1])] = macro
                    updateSizes(start, match.length, 0, macro)
                    return ""
                })
                // \DeclareMathOperator and \DeclareMathOperator* inside amsmath
                re = new RegExp(
                    "\\\\DeclareMathOperator(\\*?) *(" +
                        cs +
                        "|\\{" +
                        cs +
                        "}) *" +
                        nestBrackets(),
                    "g"
                )
                doReplace(re, function (match) {
                    var m = arguments,
                        start = m[m.length - 2],
                        end = start + match.length
                    var macro = {
                        idx: start,
                        len: m[0].length,
                        num: 0,
                        def:
                            "\\operatorname" +
                            m[1] +
                            "{" +
                            trimString(m[3]) +
                            "}",
                    }
                    macros[trimString(m[2])] = macro
                    updateSizes(start, match.length, 0, macro)
                    return ""
                })
            }

            function replaceMacros() {
                var i = 0,
                    m,
                    re,
                    num
                $.each(macros, function (name, m) {
                    ;(re = getRegExp(name, m)), (num = m.num)
                    //console.log(re);
                    doReplace(re, function (match) {
                        //console.log(arguments);
                        var start = arguments[arguments.length - 2],
                            end = start + match.length,
                            args = [],
                            result = m.def,
                            k
                        for (k = 1; k <= num; k++) {
                            args[k] = trimString(arguments[k])
                        }
                        //console.log(args);
                        for (k = 1; k <= num; k++) {
                            result = result.replace(
                                new RegExp("#" + k, "g"),
                                args[k]
                            )
                        }
                        updateSizes(start, match.length, result.length)
                        return result
                    })
                })
            }

            var raw = (tex = typejax.totaltext),
                oldraw = typejax.raw,
                size = tex.length,
                modSize = insSize - (delEnd - delStart),
                oldSize = size - modSize,
                head = delStart,
                tail = oldSize - delEnd,
                insStart,
                insEnd,
                size1,
                size2,
                that = this,
                macros = {},
                changed,
                map = [],
                mapx = []
            console.log(
                "tex:",
                "delStart",
                delStart,
                "delEnd",
                delEnd,
                "+",
                insSize,
                "=",
                size
            )

            checkMacros()
            extractMacros()
            updateMacros()
            replaceMacros()

            delStart = head
            delEnd = oldraw.length - tail
            insSize = raw.length - head - tail
            console.log(
                "raw:",
                "delStart",
                delStart,
                "delEnd",
                delEnd,
                "+",
                insSize,
                "=",
                raw.length
            )
            //console.log(raw);
            typejax.raw = raw
            typejax.rawsize = raw.length
            return { delStart: delStart, delEnd: delEnd, insSize: insSize }
        },

        typeTiny: function (delstart, delend, inssize) {
            var that = this,
                updater = typejax.updater
            var text = typejax.totaltext,
                size = typejax.totalsize

            function parseAll() {
                var output = typejax.tinyParser(text, 0, size)
                typejax.totaldata = output[0]
                updater.updateTiny(output[1], isAll)
            }

            function parseSome() {
                var modinfo = that.markData(delstart, delend, inssize),
                    output
                output = typejax.tinyParser(
                    text,
                    modinfo[0],
                    modinfo[1] + modinfo[2]
                )
                that.updateData(modinfo[3], modinfo[4], modinfo[2], output[0])
                updater.updateTiny(output[1], isAll)
            }

            var isAll = false
            if (typejax.totalsize == inssize) {
                parseAll()
                isAll = true
            } else {
                parseSome()
            }
            if (window.jaxedit) {
                console.log(
                    "size: " +
                        typejax.totalsize +
                        "; change: " +
                        delstart +
                        " to " +
                        delend
                )
            }
        },

        typeFull: function (delstart, delend, inssize) {
            var that = this,
                updater = typejax.updater,
                totaldata = typejax.totaldata,
                olddata,
                divstart,
                divend

            function parseAll() {
                // generate all preview at first time
                // or clear all text content in textarea
                divstart = 0 // for scrollIntoView after mathjax typeset
                divend = totaldata.length // for updateHeight function
                typejax.parser.load(
                    typejax.raw,
                    0,
                    typejax.raw.length,
                    function (outdiv) {
                        if (!outdiv) return parseAll()
                        olddata = totaldata
                        typejax.totaldata = outdiv
                        updater.updateFull({
                            start: divstart,
                            end: divend,
                            olddiv: olddata,
                            newdiv: outdiv,
                        })
                        typejax.totalsect = typejax.innersect
                        that.updateTOC()
                    }
                )
            }

            function parseSome() {
                var modinfo = that.markData(delstart, delend, inssize),
                    modsize = modinfo[2]
                divstart = modinfo[3]
                divend = modinfo[4]
                typejax.parser.load(
                    typejax.raw,
                    modinfo[0],
                    modinfo[1] + modsize,
                    function (outdiv) {
                        if (!outdiv) return parseAll()
                        var up = that.updateData(
                            divstart,
                            divend,
                            modsize,
                            outdiv
                        )
                        divend = up.divend
                        olddata = up.olddata
                        updater.updateFull({
                            start: divstart,
                            end: divend,
                            olddiv: olddata,
                            newdiv: outdiv,
                        })
                        that.updateSections(divstart, divend, outdiv.length)
                        that.updateTOC()
                    }
                )
            }

            if (typejax.raw.length == inssize) {
                parseAll()
            } else {
                parseSome()
            }
            if (window.jaxedit) {
                jaxedit.childs.rbot.innerHTML =
                    "size: " +
                    typejax.totalsize +
                    "; change: " +
                    delstart +
                    " to " +
                    delend
            }
        },

        markData: function (delstart, delend, inssize) {
            // determine which top level dom elements to refresh
            var divstart = -1,
                divend = -1,
                dividx = -1,
                modstart = 0,
                modend = 0,
                pdata,
                i
            for (i = 0; i < typejax.totaldata.length; i++) {
                pdata = typejax.totaldata[i]
                dividx += 1
                if (
                    pdata.from <= delstart &&
                    pdata.to >= delstart &&
                    divstart < 0
                ) {
                    modstart = pdata.from
                    divstart = dividx
                }
                if (pdata.from <= delend && pdata.to >= delend) {
                    modend = pdata.to
                    divend = dividx + 1
                }
                if (pdata.from > delend) break
            }
            // handle the case when two paragraphs were merged as one
            if (divstart > 0) {
                var data1 = typejax.totaldata[divstart - 1],
                    data2 = typejax.totaldata[divstart],
                    re = /^\n *\n/,
                    str = typejax.totaltext.slice(data2.from, data2.to)
                if (
                    str.charAt(0) == "\n" &&
                    !re.test(str) &&
                    data1.name == "par"
                ) {
                    divstart = divstart - 1
                    modstart = data1.from
                }
            }

            var modsize = inssize - (delend - delstart)
            console.log(
                "div:",
                divstart,
                divend,
                "modify:",
                modstart,
                modend + modsize
            )
            //var modtext = typejax.totaltext.substring(modstart,modend + modsize);
            //console.log("modtext:", modtext);
            return [modstart, modend, modsize, divstart, divend]
        },

        updateData: function (divstart, divend, modsize, out) {
            var data = typejax.totaldata,
                olddata,
                to = out[out.length - 1].to,
                n = 0,
                i
            olddata = data.splice(divstart, divend - divstart)
            for (i = divstart; i < data.length; i++) {
                data[i].from += modsize
                data[i].to += modsize
                if (data[i].to <= to) n++
            }
            if (n) olddata.concat(data.splice(divstart, n))
            for (i = 0; i < out.length; i++) {
                data.splice(divstart + i, 0, out[i])
            }
            divend += n
            //console.log("olddata:", olddata);
            return { divend: divend, olddata: olddata }
        },

        updateSections: function (divstart, divend, datalength) {
            var sectdata,
                from = 0,
                to = 0,
                i = 0
            for (i = 0; i < typejax.totalsect.length; i++) {
                sectdata = typejax.totalsect[i]
                if (sectdata[0] < divstart) {
                    from += 1
                    to += 1
                } else if (sectdata[0] >= divstart && sectdata[0] < divend) {
                    to += 1
                } else {
                    break
                }
            }
            for (i = to; i < typejax.totalsect.length; i++) {
                typejax.totalsect[i][0] += datalength - (divend - divstart)
            }
            typejax.totalsect.splice(from, to - from)
            for (i = 0; i < typejax.innersect.length; i++) {
                sectdata = typejax.innersect[i]
                typejax.totalsect.splice(from + i, 0, [
                    sectdata[0] + divstart,
                    sectdata[1],
                    sectdata[2],
                    sectdata[3],
                ])
            }
        },

        updateTOC: function () {
            var sectdata, numstr, tocstr, tocdiv, anchor
            var subcounters = typejax.parser.latex.subcounters,
                style = ""
            tocstr = "<div class='contentname'><b>Contents</b></div>"
            for (i = 0; i < typejax.totalsect.length; i++) {
                sectdata = typejax.totalsect[i]
                sectname = sectdata[1]
                numstr = "<span class='the-toc-" + sectname + "'></span>"
                anchor = sectdata[3]
                if (subcounters["-toc-" + sectname])
                    style =
                        " style='counter-reset:" +
                        subcounters["-toc-" + sectname] +
                        ";'"
                tocstr +=
                    "<div class='toc-" +
                    sectname +
                    "'" +
                    style +
                    "><a href='#" +
                    anchor +
                    "'>" +
                    numstr +
                    sectdata[2] +
                    "</a></div>"
            }
            tocdiv = document.getElementById("tableofcontents")
            if (tocdiv) tocdiv.innerHTML = tocstr
        },
    }

    // TODO: tinyparser句法分析
    typejax.tinyParser = function (input, modstart, modend) {
        var data = [],
            text = input.slice(modstart, modend)
        var re = /(\n|\r\n){2,}/g,
            i = modstart
        while (re.exec(text) != null) {
            data.push({ from: i, to: (i = modstart + re.lastIndex) })
        }
        if (i < modend) data.push({ from: i, to: modend })

        var dmaths = [
            "equation",
            "equation*",
            "eqnarray",
            "eqnarray*",
            "gather",
            "gather*",
            "align",
            "align*",
            "alignat",
            "alignat*",
            "multline",
            "multline*",
        ]
        var imaths = [
            "gathered",
            "aligned",
            "alignedat",
            "split",
            "array",
            "smallmatrix",
            "subarray",
            "cases",
            "matrix",
            "pmatrix",
            "bmatrix",
            "Bmatrix",
            "vmatrix",
            "Vmatrix",
        ]
        // begin环境正则
        var re = /(?:\n|\r\n)?\\begin\{([\w\*]+)\}([\w\W]*?)\\end\{\1\}(?:\n|\r\n)?/g
        text = text.replace(re, function (match, p1, p2, offset) {
            if ($.inArray(p1, dmaths) != -1) {
                return "$$" + "\\begin{" + p1 + "}" + p2 + "\\end{" + p1 + "}$$"
            } else {
                return (
                    "\\begin{" +
                    p1 +
                    "}" +
                    p2.replace(re, arguments.callee) +
                    "\\end{" +
                    p1 +
                    "}"
                )
            }
        })
        text = $.escapeText(text)
        text = text.replace(/(\n|\r\n)*$/, "")
        text = text.replace(/\n|\r\n/g, "<br>")
        return [data, text]
    }

    // TODO: 句法分析
    typejax.parser = (function (that) {
        var input,
            modstart,
            modend,
            callback,
            done,
            time,
            base = $.findScript("typejax.js")

        // lexer 对象
        var lexer = {
            snippet: "", // 源输入的内容
            length: 0, // 源输入的长度
            index: 0, // 当前坐标
            modend: 0, // 输入当前的mod end
            ended: false, // ended?

            // 初始化
            initialize: function (input, modstart, modend) {
                this.snippet = input // 片段赋值输入的内容
                this.length = input.length // 为输入的长度
                this.index = modstart // modstart为索引
                this.modend = modend // modend 为 modend
                this.ended = false // ended 为 false
            },

            // 是否是最后?
            atLast: function () {
                return this.index >= this.length || this.ended == true
                    ? true
                    : false
            },

            // 是否结束？
            atEnding: function () {
                return this.index >= this.modend ? true : false
            },

            // BUG: 等会处理这个部分
            newEnding: function () {
                for (var i = 0; i < typejax.totaldata.length; i++) {
                    if (typejax.totaldata[i][0] == this.modend) {
                        this.modend = typejax.totaldata[i][1]
                        console.log("newEnding:", this.modend)
                        break
                    }
                }
            },

            // 下一个token
            nextToken: function () {
                // find next token
                //console.log(length,index);
                // 类型、值、place为初始索引
                var type = "",
                    value = "",
                    place = this.index
                // 如果是最后
                if (this.atLast())
                    return { type: "", value: "", place: this.length }
                // 如果手动结束触发
                if (this.atEnding()) {
                    var d = syner.nodearray
                    if (
                        d.length > 0 &&
                        d[0].from < this.modend &&
                        d[0].name != "par"
                    ) {
                        this.newEnding()
                    } else {
                        this.ended = true
                        return { type: "", value: "", place: this.modend }
                    }
                }

                // 当前的字符
                var curchar = this.snippet.charAt(this.index)
                // 下一个字符 nextchar,下一个 nextcode, i = 0
                var nextchar = "",
                    nextcode = 0,
                    i = 0

                // 如果当前的char是\\
                if (curchar == "\\") {
                    type = "escape"
                    value = "\\"
                } else if (curchar == "%") {
                    // 如果当前的字符为%
                    type = "comment"
                    value = "%"
                } else if (curchar == " ") {
                    // 如果当前的字符为空格
                    type = "space"
                    value = " "
                } else if (curchar == "\n") {
                    // 如果当前字符是换行
                    type = "space"
                    value = "\n"
                } else if (curchar == "\r") {
                    // 如果当前字符为回车
                    // 获取下一个字符
                    nextchar = this.snippet.charAt(this.index + 1)
                    // 如果下一个字符为回车
                    if (nextchar == "\n") {
                        // \r\n in ie
                        type = "space"
                        value = "\n"
                        this.index += 1
                    } else {
                        // 否则
                        type = "space"
                        value = "\n"
                    }
                } else if (/[\!-\$&-\/\:-@\[-`\{-~]/.test(curchar)) {
                    // 如果当前字符为特殊字符
                    type = "special"
                    value = curchar
                } else if (/[a-zA-Z]/.test(curchar)) {
                    // 如果当前字符为字母
                    i = this.index
                    // 获取当前的索引值，直到下一个字符不是字母
                    do {
                        i += 1
                        nextchar = this.snippet.charAt(i)
                    } while (/[a-zA-Z]/.test(nextchar))
                    // 类型为字母
                    type = "alphabet"
                    // 获取子串，从开始一直到累计长度
                    value = this.snippet.substring(this.index, i)
                    // 更改index索引
                    this.index = i - 1
                } else if (/[0-9]/.test(curchar)) {
                    // 索引设为零
                    i = this.index
                    do {
                        i += 1
                        nextchar = this.snippet.charAt(i)
                    } while (/[0-9]/.test(nextchar))
                    // 类型为number
                    type = "number"
                    // 获取子串
                    value = this.snippet.substring(this.index, i)
                    // 更改index索引
                    this.index = i - 1
                } else {
                    // i为index索引
                    // ASCII码大于127为Unicode
                    i = this.index
                    do {
                        i += 1
                        nextcode = this.snippet.charCodeAt(i)
                    } while (nextcode > 127)
                    // 类型为Unicode
                    type = "unicode"
                    value = this.snippet.substring(this.index, i)
                    // 更改index索引
                    this.index = i - 1
                }

                // 索引自增
                this.index += 1
                //console.log(type, value);
                return { type: type, value: value, place: place }
            },

            // 滚回去，index自减
            goBack: function (i) {
                this.index -= i
            },
        }

        // TODO: syner对象
        var syner = {
            innertree: {}, // inner树
            type: "", // 类型
            value: "", // 值
            place: -1, // place
            mathenv: "", // mathenv
            intabular: false, // 制表
            omitspace: false, // 省略空间

            // TODO: 分析
            /**
             *
             * @param {*} input 输入
             * @param {*} modstart mod start
             * @param {*} modend mod end
             */
            analysis: function (input, modstart, modend) {
                //console.log("initialize lexer");
                // 初始化词法分析器
                lexer.initialize(input, modstart, modend)

                // 初始化语法树
                this.initTree()
                this.mathenv = ""
                this.omitspace = false
                typejax.innersect = []

                this.packages = packages
                this.cmdvalues = latex.cmdvalues
                this.counters = latex.counters
                this.theorems = latex.theorems

                this.openNewGroup("env", "par", modstart)

                while (!lexer.atLast()) {
                    var token = lexer.nextToken()
                    //alert(this.token.type, token.value);
                    this.type = token.type
                    this.value = token.value
                    this.place = token.place
                    this.mainLoop()
                }

                this.closeOldMath(lexer.modend)
                while (this.nodelevel > 0) {
                    this.closeOldGroup(lexer.modend)
                }
            },

            // TODO: 主循环
            mainLoop: function () {
                switch (this.type) {
                    case "escape":
                        this.tokenEscape()
                        break
                    case "comment":
                        this.tokenComment()
                        break
                    case "space":
                        this.tokenSpace()
                        break
                    case "special":
                        this.tokenSpecial()
                        break
                    case "alphabet":
                        this.tokenAlphabet()
                        break
                    case "number":
                        this.tokenNumber()
                        break
                    case "unicode":
                        this.tokenUnicode()
                        break
                }
            },

            // TODO: token escape
            tokenEscape: function () {
                this.closeEmptyArg(this.place)
                this.omitspace = false
                var token = lexer.nextToken()
                this.type = token.type
                this.value = token.value
                this.place = token.place
                if (this.type == "") {
                    this.addText("\\", this.place - 1)
                    return
                }
                switch (this.type) {
                    case "escape":
                        if (this.mathenv != "") {
                            this.addText("\\\\", this.place - 1)
                        } else if (this.intabular) {
                            this.addText("</td></tr><tr><td>", this.place - 1)
                        } else {
                            this.addText("<br>", this.place - 1)
                        }
                        break
                    case "comment":
                        this.addText("%", this.place - 1)
                        break
                    case "space":
                        this.addText(" ", this.place - 1)
                        break
                    // TODO: case: 特殊字符处理
                    case "special":
                        switch (this.value) {
                            case "#":
                            case "&":
                            case "$":
                            case "_":
                            case "{":
                            case "}":
                                if (this.mathenv != "") {
                                    this.addText(
                                        "\\" + this.value,
                                        this.place - 1
                                    )
                                } else {
                                    this.addText(this.value, this.place - 1)
                                }
                                break
                            case ";":
                                if (this.mathenv != "") {
                                    this.addText(
                                        "\\" + this.value,
                                        this.place - 1
                                    )
                                } else {
                                    this.addText(
                                        "<span class='thickspace'></span>",
                                        this.place - 1
                                    )
                                }
                                break
                            case ":":
                                if (this.mathenv != "") {
                                    this.addText(
                                        "\\" + this.value,
                                        this.place - 1
                                    )
                                } else {
                                    this.addText(
                                        "<span class='medspace'></span>",
                                        this.place - 1
                                    )
                                }
                                break
                            case ",":
                                if (this.mathenv != "") {
                                    this.addText(
                                        "\\" + this.value,
                                        this.place - 1
                                    )
                                } else {
                                    this.addText(
                                        "<span class='thinspace'></span>",
                                        this.place - 1
                                    )
                                }
                                break
                            case "!":
                                if (this.mathenv != "") {
                                    this.addText(
                                        "\\" + this.value,
                                        this.place - 1
                                    )
                                } else {
                                    this.addText(
                                        "<span class='negthinspace'></span>",
                                        this.place - 1
                                    )
                                }
                                break
                            case "(":
                                if (this.mathenv != "") {
                                    this.closeOldGroup(this.place - 1)
                                }
                                this.openNewGroup(
                                    "env",
                                    "imath",
                                    this.place - 1
                                )
                                this.mathenv = "()"
                                break
                            case ")":
                                if (this.mathenv == "()") {
                                    this.closeOldGroup(this.place + 1)
                                } else if (this.mathenv != "") {
                                    this.closeOldGroup(this.place + 1)
                                    this.addText("\\)", this.place - 1)
                                } else {
                                    this.addText("\\)", this.place - 1)
                                }
                                this.mathenv = ""
                                break
                            case "[":
                                if (this.mathenv != "") {
                                    this.closeOldGroup(this.place - 1)
                                }
                                this.openNewGroup(
                                    "env",
                                    "bmath",
                                    this.place - 1
                                )
                                this.mathenv = "[]"
                                break
                            case "]":
                                if (this.mathenv == "[]") {
                                    this.closeOldGroup(
                                        "env",
                                        "bmath",
                                        this.place + 1
                                    )
                                } else if (this.mathenv != "") {
                                    this.closeOldGroup(
                                        "env",
                                        "bmath",
                                        this.place + 1
                                    )
                                    this.addText("\\]", this.place - 1)
                                } else {
                                    this.addText("\\]", this.place - 1)
                                }
                                this.mathenv = ""
                                break
                            default:
                                this.addText("\\" + this.value, this.place - 1)
                        }
                        break
                    case "alphabet":
                        var csname = this.value
                        token = lexer.nextToken()
                        if (token.value == "*") {
                            csname += "*"
                        } else {
                            lexer.goBack(token.value.length)
                        }
                        if (this.mathenv == "") {
                            this.omitspace = true
                        }
                        switch (csname) {
                            case "begin":
                            case "end":
                                this.cmdsSimple(csname, this.place - 1)
                                break
                            case "documentclass":
                                this.closeOldMath(this.place - 1)
                                this.closeOldCmds(this.place - 1)
                                this.beginGroup(
                                    "env",
                                    "preamble",
                                    this.place - 1,
                                    this.place - 1
                                )
                                this.beginGroup(
                                    "cmd",
                                    "documentclass",
                                    this.place - 1,
                                    this.place + csname.length
                                )
                                break
                            case "item":
                                this.beginGroup(
                                    "env",
                                    "item",
                                    this.place - 1,
                                    this.place + 4
                                )
                                break
                            case "maketitle":
                            case "titlepage":
                                this.closeOldMath(this.place - 1)
                                this.closeOldCmds(this.place - 1)
                                this.beginGroup(
                                    "cmd",
                                    csname,
                                    this.place - 1,
                                    this.place - 1
                                )
                                this.endGroup(
                                    "cmd",
                                    csname,
                                    this.place + csname.length,
                                    this.place + csname.length
                                )
                                break
                            case "tableofcontents":
                                this.closeOldMath(this.place - 1)
                                this.closeOldCmds(this.place - 1)
                                this.beginGroup(
                                    "cmd",
                                    csname,
                                    this.place - 1,
                                    this.place + csname.length
                                )
                                break
                            case "par":
                                this.closeOldMath(this.place - 1)
                                this.beginGroup(
                                    "env",
                                    "par",
                                    this.place - 1,
                                    this.place + 3
                                )
                                break
                            case "paragraph":
                            case "paragraph*":
                            case "subparagraph":
                            case "subparagraph*":
                                this.closeOldMath(this.place - 1)
                                this.beginGroup(
                                    "env",
                                    "par",
                                    this.place - 1,
                                    this.place - 1
                                )
                                this.beginGroup(
                                    "cmd",
                                    csname,
                                    this.place - 1,
                                    this.place + csname.length
                                )
                                break
                            default:
                                var argtype = this.getArgsType("cmd", csname)
                                if (argtype.length > 0) {
                                    this.closeOldMath(this.place - 1)
                                    this.beginGroup(
                                        "cmd",
                                        csname,
                                        this.place - 1,
                                        this.place + csname.length
                                    )
                                } else {
                                    this.doSimple(csname)
                                }
                        }
                        break
                    default:
                        this.addText("\\" + csname, this.place - 1)
                }
            },

            tokenComment: function () {
                this.omitspace = false
                var token = lexer.nextToken()
                this.type = token.type
                this.value = token.value
                this.place = token.place
                while (this.value != "" && this.value != "\n") {
                    token = lexer.nextToken()
                    this.type = token.type
                    this.value = token.value
                    this.place = token.place
                }
            },

            tokenSpace: function () {
                if (this.omitspace) return
                switch (this.value) {
                    case " ":
                        this.addText(this.value, this.place)
                        break
                    case "\n":
                        var p = this.place,
                            token
                        do {
                            token = lexer.nextToken()
                            this.type = token.type
                            this.value = token.value
                        } while (this.value == " ")
                        if (this.type == "space" && this.value == "\n") {
                            this.closeOldMath(p)
                            this.beginGroup("env", "par", p, this.place)
                            this.omitspace = true
                        } else {
                            this.addText(" ", this.place)
                            lexer.goBack(this.value.length)
                        }
                        break
                }
            },

            // TODO: 特殊token处理
            tokenSpecial: function () {
                this.omitspace = false
                switch (this.value) {
                    case "{":
                    case "}":
                    case "[":
                    case "]":
                    case "<":
                    case ">":
                        if (this.mathenv != "") {
                            this.addText(this.value, this.place)
                            break
                        }
                        this.addBracket(this.value, this.place)
                        break
                    case "$":
                        this.getMathDollar(this.place)
                        break
                    case "&":
                        if (this.mathenv != "") {
                            this.addText(this.value, this.place)
                        } else if (this.intabular) {
                            this.addText("</td><td>", this.place)
                        } else {
                            this.addText(this.value, this.place)
                        }
                        break
                    case "`":
                        if (this.mathenv != "") {
                            this.addText(this.value, this.place)
                        } else {
                            var token = lexer.nextToken()
                            if (token.value == "`") {
                                this.addText("&ldquo;", this.place)
                            } else {
                                this.addText("&lsquo;", this.place)
                                lexer.goBack(token.value.length)
                            }
                        }
                        break
                    case "'":
                        if (this.mathenv != "") {
                            this.addText(this.value, this.place)
                        } else {
                            var token = lexer.nextToken()
                            if (token.value == "'") {
                                this.addText("&rdquo;", this.place)
                            } else {
                                this.addText("&rsquo;", this.place)
                                lexer.goBack(token.value.length)
                            }
                        }
                        break
                    default:
                        this.addText(this.value, this.place)
                }
            },

            // TODO: 字母token处理
            tokenAlphabet: function () {
                this.omitspace = false
                this.addText(this.value, this.place)
            },

            // TODO: 数字token处理
            tokenNumber: function () {
                this.omitspace = false
                this.addText(this.value, this.place)
            },

            // TODO: 处理unicode
            tokenUnicode: function () {
                this.omitspace = false
                this.addText(this.value, this.place)
            },

            doSimple: function (name) {
                var work = this[
                    "cmd" + name.charAt(0).toUpperCase() + name.slice(1)
                ]
                if (work) {
                    work.call(this)
                } else {
                    //inside text or math
                    this.addText("\\" + name, this.place - 1)
                }
            },

            // 执行命令
            doCommand: function (node) {
                var name = node.name,
                    same = this.getGroupSame(name)
                var work = this.renderers.find("cmd", same)
                if (work) {
                    work.call(this, node)
                }
            },

            cmdsSimple: function (csname, where) {
                // with single parameter
                var token = lexer.nextToken()
                this.type = token.type
                this.value = token.value
                this.place = token.place
                if (this.type == "special" && this.value == "{") {
                    token = lexer.nextToken()
                    this.type = token.type
                    this.value = token.value
                    this.place = token.place
                    if (this.type == "alphabet") {
                        var envname = token.value
                        token = lexer.nextToken()
                        this.type = token.type
                        this.value = token.value
                        this.place = token.place
                        if (this.type == "special" && this.value == "}") {
                            this.cmdsBeginEnd(csname, envname, where)
                        } else if (
                            this.type == "special" &&
                            this.value == "*"
                        ) {
                            envname += "*"
                            token = lexer.nextToken()
                            this.type = token.type
                            this.value = token.value
                            this.place = token.place
                            if (this.type == "special" && this.value == "}") {
                                this.cmdsBeginEnd(csname, envname, where)
                            } else {
                                this.addText(
                                    "\\" + csname + "{" + envname,
                                    where
                                )
                                lexer.goBack(this.value.length)
                            }
                        } else {
                            this.addText("\\" + csname + "{" + envname, where)
                            lexer.goBack(this.value.length)
                        }
                    } else {
                        this.addText("\\" + csname + "{", where)
                        lexer.goBack(this.value.length)
                    }
                } else {
                    this.addText("\\" + csname, where)
                    lexer.goBack(this.value.length)
                }
            },

            // TODO: begin环境块
            cmdsBeginEnd: function (csname, envname, where) {
                var mathmode = "bmath",
                    mathdelim = true
                switch (envname) {
                    // toplevel math environments
                    case "math":
                        mathmode = "imath" // don't break!
                    case "displaymath":
                        mathdelim = false // don't break!
                    case "equation":
                    case "equation*":
                    case "eqnarray":
                    case "eqnarray*":
                    case "gather":
                    case "gather*":
                    case "align":
                    case "align*":
                    case "alignat":
                    case "alignat*":
                    case "multline":
                    case "multline*":
                        if (csname == "begin") {
                            if (this.mathenv != "") {
                                this.closeOldGroup(where)
                            }
                            this.beginGroup(
                                "env",
                                mathmode,
                                where,
                                where + 8 + envname.length
                            )
                            if (mathdelim) {
                                this.addText(
                                    "\\begin{" + envname + "}",
                                    where + 8 + envname.length
                                )
                            }
                            this.mathenv = envname
                        } else {
                            if (this.mathenv != "") {
                                if (mathdelim) {
                                    this.addText(
                                        "\\end{" + envname + "}",
                                        where
                                    )
                                }
                                this.endGroup(
                                    "env",
                                    mathmode,
                                    where,
                                    where + 6 + envname.length
                                )
                            } else {
                                this.addText("\\end{" + envname + "}", where)
                            }
                            this.mathenv = ""
                        }
                        break
                    // environments inside math
                    case "gathered":
                    case "aligned":
                    case "alignedat":
                    case "split":
                    case "array":
                    case "smallmatrix":
                    case "subarray":
                    case "cases":
                    case "matrix":
                    case "pmatrix":
                    case "bmatrix":
                    case "Bmatrix":
                    case "vmatrix":
                    case "Vmatrix":
                        if (csname == "begin") {
                            if (this.mathenv == "") {
                                this.beginGroup(
                                    "env",
                                    mathmode,
                                    where,
                                    where + 8 + envname.length
                                )
                                this.addText("\\begin{" + envname + "}", where)
                                this.mathenv = envname
                            } else {
                                this.addText("\\begin{" + envname + "}", where)
                            }
                        } else {
                            if (this.mathenv == envname) {
                                this.addText("\\end{" + envname + "}", where)
                                this.endGroup(
                                    "env",
                                    mathmode,
                                    where,
                                    where + 6 + envname.length
                                )
                                this.mathenv = ""
                            } else {
                                this.addText("\\end{" + envname + "}", where)
                            }
                        }
                        break
                    // text environments
                    case "CJK":
                    case "CJK*":
                        this.addText("\\" + csname + "{" + envname + "}")
                        break
                    case "document":
                        this.closeOldCmds(where)
                        if (csname == "begin") {
                            this.endGroup(
                                "env",
                                "preamble",
                                where,
                                where + 8 + "document".length
                            )
                        } else {
                            this.beginGroup("env", "par", where)
                        }
                        break
                    case "tabular":
                        this.closeOldMath(where)
                        if (csname == "begin") {
                            this.beginGroup(
                                "env",
                                envname,
                                where,
                                where + 8 + envname.length
                            )
                            this.intabular = true
                        } else {
                            this.endGroup(
                                "env",
                                envname,
                                where,
                                where + 6 + envname.length
                            )
                        }
                        break
                    case "verbatim":
                        this.closeOldMath(where)
                        if (csname == "begin") {
                            this.beginGroup(
                                "env",
                                envname,
                                where,
                                where + 8 + envname.length
                            )
                            this.getVerbatim(envname)
                            this.endGroup(
                                "env",
                                envname,
                                this.place - 5 - envname.length,
                                this.place + 1
                            )
                        } else {
                            this.addText(
                                "\\" + csname + "{" + envname + "}",
                                where
                            )
                        }
                        break
                    default:
                        if (this.definitions.find("environment", envname)) {
                            this.closeOldMath(where)
                            if (csname == "begin") {
                                this.beginGroup(
                                    "env",
                                    envname,
                                    where,
                                    where + 8 + envname.length
                                )
                            } else {
                                this.endGroup(
                                    "env",
                                    envname,
                                    where,
                                    where + 6 + envname.length
                                )
                            }
                        } else {
                            // unknown environment, could be a math or text environment
                            this.addText(
                                "\\" + csname + "{" + envname + "}",
                                where
                            )
                        }
                }
            },

            // TODO: 环境执行
            doEnvironment: function (node) {
                var name = node.name,
                    same = this.getGroupSame(name)
                var work = this.renderers.find("env", same)
                if (work) {
                    work.call(this, node)
                } else {
                    if (this.theorems[name]) {
                        this.envTheorem(node)
                    }
                }
            },

            // TODO: 获取数学的dollar符号
            getMathDollar: function (position) {
                if (this.mathenv == "$") {
                    this.closeOldGroup(position + 1)
                    this.mathenv = ""
                    return
                }
                if (this.mathenv == "$$") {
                    var token = lexer.nextToken()
                    if (token.value == "$") {
                        this.closeOldGroup("env", "bmath", position + 2)
                    } else {
                        this.closeOldGroup("env", "bmath", position + 1)
                        this.type = token.type
                        this.value = token.value
                        this.place = token.place
                        lexer.goBack(this.value.length)
                    }
                    this.mathenv = ""
                    return
                }
                if (this.mathenv) return // different math type
                this.closeEmptyArg(position)
                var token = lexer.nextToken()
                this.value = token.value
                if (this.value == "$") {
                    // display math
                    this.openNewGroup("env", "bmath", position)
                    token = lexer.nextToken()
                    this.type = token.type
                    this.value = token.value
                    this.place = token.place
                    this.mathenv = "$$"
                    lexer.goBack(this.value.length)
                } else {
                    // inline math
                    this.openNewGroup("env", "imath", position)
                    this.mathenv = "$"
                    this.addText(this.value, position + 1)
                    /*
          token = lexer.nextToken();
          this.type = token.type;
          this.value = token.value;
          this.place = token.place;
          lexer.goBack(this.value.length);
          */
                }
            },

            // TODO: 逐字？
            getVerbatim: function (envname) {
                //console.log("verbatim");
                var t1 = lexer.nextToken()
                if (t1.value == "\n" || t1.value == " ") {
                    t1 = lexer.nextToken()
                }
                var t2 = lexer.nextToken()
                var t3 = lexer.nextToken()
                var t4 = lexer.nextToken()
                var t5 = lexer.nextToken()
                while (
                    t1.type != "escape" ||
                    t2.type != "alphabet" ||
                    t2.value != "end" ||
                    t3.type != "special" ||
                    t3.value != "{" ||
                    t4.type != "alphabet" ||
                    t4.value != envname ||
                    t5.type != "special" ||
                    t5.value != "}"
                ) {
                    switch (t1.value) {
                        case "\n":
                            this.addText("<br>", t1.place)
                            break
                        case "<":
                            this.addText("&lt;", t1.place)
                            break
                        case ">":
                            this.addText("&gt;", t1.place)
                            break
                        default:
                            this.addText(t1.value, t1.place)
                    }
                    t1 = t2
                    t2 = t3
                    t3 = t4
                    t4 = t5
                    t5 = lexer.nextToken()
                    this.place = t5.place
                    if (t5.value == "") break
                }
            },

            // TODO: 开始group
            beginGroup: function (type, name, thispos, nextpos) {
                while (
                    this.nodelevel > 0 &&
                    !this.includeGroup(this.nodeplace.name, name)
                ) {
                    this.closeOldGroup(thispos)
                }
                this.openNewGroup(type, name, thispos)
                var mode = this.getGroupMode(name)
                if (mode == "main" && this.nodeplace.argtype[0] == "||") {
                    // if argtype is not ["||"], we open new par in addBracket() or addText()
                    this.openNewGroup("env", "par", nextpos)
                }
            },

            // TODO： 关闭group
            endGroup: function (type, name, thispos, nextpos) {
                var mode = this.getGroupMode(name)
                if (type == "env") {
                    var match = -1
                    for (i = this.nodelevel - 1; i >= 0; i--) {
                        if (this.nodearray[i].name == name) {
                            match = i
                            break
                        }
                    }
                    if (match == -1) {
                        this.addText("\\end{" + name + "}", thispos)
                    } else {
                        for (i = this.nodelevel - 1; i > match; i--) {
                            this.closeOldGroup(thispos)
                        }
                        this.closeOldGroup(nextpos)
                        if (mode == "main" || mode == "block") {
                            this.openNewGroup("env", "par", nextpos)
                        }
                    }
                } else {
                    // "cmd"
                    this.closeOldGroup(nextpos)
                    if (mode == "main" || mode == "block") {
                        this.openNewGroup("env", "par", nextpos)
                    }
                }
            },

            // TODO: 关闭先前的group
            closeOldGroup: function (position) {
                //console.log("close:", position);
                var node = this.nodeplace,
                    argtype = node.argtype
                for (var j = node.argarray.length; j < argtype.length; j++) {
                    if (argtype[j] == "{}") {
                        this.openChild("env", "{}", position, true)
                    } else if (argtype[j] == "||") {
                        node.argarray[j] == node
                    } else {
                        node.argarray[j] = null
                    }
                }
                node.to = position
                this.doThisGroup()
                //console.log("close:", node.name, node.argtype);
                //console.log("close:", this.nodearray);
            },

            // TODO: 打开一个新的group
            openNewGroup: function (type, name, position) {
                //console.log("open: ", type, name, position);
                var args = this.getArgsType(type, name)
                if (type == "env") {
                    if (args.length == 1) {
                        this.openChild("env", name, position)
                    } else {
                        this.openChild("env", name, position)
                    }
                } else {
                    // "cmd"
                    this.openChild("cmd", name, position)
                }
                //console.log("open: ", this.nodeplace.name, this.nodeplace.argtype);
                //console.log("open: ", this.nodearray);
            },

            // TODO: 关闭旧的数学
            closeOldMath: function (position) {
                if (this.mathenv != "") {
                    this.closeOldGroup(position)
                    this.mathenv = ""
                }
            },

            // TODO: 关闭旧的命令
            closeOldCmds: function (position) {
                var node
                while (this.nodelevel > 0) {
                    node = this.nodeplace
                    if (node.type != "cmd") {
                        break
                    } else {
                        this.closeOldGroup(position)
                    }
                }
            },

            // TODO: 关闭空参数
            closeEmptyArg: function (position) {
                if (this.nodelevel > 0) {
                    var node = this.nodeplace
                } else {
                    return
                }
                if (node.type == "cmd" && node.argarray.length == 0) {
                    this.closeOldGroup(position)
                    if (node.mode == "main" || node.mode == "block") {
                        this.openNewGroup("env", "par", this.place)
                    }
                } else if (node.type == "env") {
                    for (
                        var j = node.argarray.length;
                        j < node.argtype.length - 1;
                        j++
                    ) {
                        if (node.argtype[j] == "{}") {
                            node.argarray[j] = this.openChild(
                                "env",
                                "{}",
                                position
                            )
                        } else {
                            node.argarray[j] = null
                        }
                    }
                    if (node.mode == "main") {
                        this.openNewGroup("env", "par", this.place)
                    }
                }
            },

            doThisGroup: function () {
                var node = this.nodeplace
                this.closeChild(node.to)
                //console.log("doThisGroup: ", node);
                if (node.to > node.from) {
                    if (node.type == "env") {
                        this.doEnvironment(node)
                    } else {
                        this.doCommand(node)
                    }
                }
                if (this.nodelevel == 0) {
                    if (!node.to) console.log("doThisGroup: node.to is empty!")
                }
                //console.log("doThisGroup: ", node.name, node.argtype);
                //console.log("doThisGroup: ", this.nodearray);
            },

            // TODO: 初始化树
            initTree: function () {
                // 最顶级的树
                this.innertree = {
                    // top level
                    mode: "main",
                    name: "tree",
                    from: 0,
                    to: null,
                    value: "",
                    argarray: [],
                    parent: null,
                    childs: [],
                }
                // nodeplace为当前的树
                this.nodeplace = this.innertree
                // 等级为0
                this.nodelevel = 0
                // 节点数组
                this.nodearray = []
            },

            // TODO: 开启子节点
            openChild: function (type, name, from, mark) {
                // nodeplace赋值给parent
                var parent = this.nodeplace
                // 如果父元素不存在
                if (!parent) {
                    // 输出打开子错误
                    typejax.message.log("node", "openChild: wrong nodeplace!")
                    return
                }
                // 打开子
                typejax.message.log("node", "OpenChild: ", type, name, from)
                // 初始化节点node对象
                var node = {
                    // 类型、名称、模式、来源、值、参数类型、参数数组、父、子
                    type: type,
                    name: name,
                    mode: this.getGroupMode(name),
                    from: from,
                    value: "",
                    argtype: this.getArgsType(type, name),
                    argarray: [],
                    parent: parent,
                    childs: [],
                }
                // 将节点对象push到父的子
                parent.childs.push(node)

                // 更改nodeplace为当前的节点
                this.nodeplace = node
                // 节点层级加一
                this.nodelevel += 1
                // 节点数组push
                this.nodearray.push(node)

                // 如果节点参数的类型长度为1并且类型为||
                if (node.argtype.length == 1 && node.argtype[0] == "||") {
                    node.argarray.push(node)
                    // 节点名称为group
                } else if (node.name == "group") {
                    node.argarray.push(node)
                }
                // 如果mark存在
                if (mark) {
                    parent.argarray.push(node)
                } else if (
                    // 如果父参数的最后一项为||
                    parent.argtype &&
                    parent.argtype[parent.argarray.length] === "||"
                ) {
                    parent.argarray.push(parent)
                }

                // 打印节点信息
                typejax.message.log(
                    "node",
                    "nodelevel:",
                    this.nodelevel,
                    "arglength:",
                    node.argarray.length
                )
                //this.printTree(this.innertree);
                return node
            },

            // 关闭子节点，传入position
            closeChild: function (position) {
                // 获取nodeplace为node
                var node = this.nodeplace
                // node的to指向position
                node.to = position
                // 如果node不存在，报错
                if (!node) {
                    typejax.message.log("node", "closeChild: wrong nodeplace!")
                    return
                }
                // 关闭node
                typejax.message.log(
                    "node",
                    "CloseChild:",
                    node.type,
                    node.name,
                    node.to
                )
                // node.from >= node.to ？
                // node父节点的子节点射出最后一个
                if (node.from >= node.to) {
                    //console.log("closeChild: empty group " + node.name);
                    node.parent.childs.pop()
                }
                // 把nodeplace改到父节点
                this.nodeplace = this.nodeplace.parent
                // 节点层级-1
                this.nodelevel -= 1
                // 节点数组射出最后一个
                this.nodearray.pop()

                // 如果节点的模式是inline或者，节点的名称是bmath
                if (node.mode == "inline" || node.name == "bmath") {
                    if (
                        node.name != "{}" &&
                        node.name != "[]" &&
                        node.name != "{]" &&
                        node.name != "<>"
                    ) {
                        var textnode = {
                            type: "env",
                            name: "itext",
                            mode: "inline",
                            from: node.to,
                            to: -1,
                            value: "",
                            parent: node.parent,
                            childs: [],
                        }
                        node.parent.childs.push(textnode)
                    }
                } else if (node.mode == "block" && node.name != "bmath") {
                    // 如果节点的模式是块节点，名称也不是bmath
                    /*node.childs[node.childs.length -1].to = node.to;*/
                }
                // 打印node的层级
                typejax.message.log("node", "nodelevel:", this.nodelevel)
                //this.printTree(this.innertree);
            },

            travelDown: function () {
                this.nodeplace = this.nodeplace.childs[0]
                this.nodelevel += 1
            },

            travelUp: function () {
                this.nodeplace = this.nodeplace.parent
                this.nodelevel -= 1
            },

            // 打印树
            printTree: function (tree, spaces) {
                if (!spaces) spaces = ""
                that.message.log(
                    "tree",
                    "|" + spaces + tree.mode,
                    tree.name,
                    tree.from,
                    tree.to,
                    tree.value
                )
                for (var i = 0; i < tree.childs.length; i++) {
                    this.printTree(tree.childs[i], spaces + "--")
                }
            },

            // 新建Text节点
            createTextNode: function (node) {
                // 如果节点的mode不是main，节点的名称不是bmath、imath
                if (
                    node.mode != "main" &&
                    node.name != "bmath" &&
                    node.name != "imath"
                ) {
                    // 类型是env、名称是行内文本、模式也是行内
                    var textnode = {
                        type: "env",
                        name: "itext",
                        mode: "inline",
                        from: node.from,
                        to: -1,
                        value: "",
                        parent: node,
                        childs: [],
                    }
                    // 向节点的子节点push
                    node.childs.push(textnode)
                }
            },

            // BUG 拓展参数值 这里并没有处理argsValue参数
            appendArgsValue: function (index, value) {
                var node = this.nodeplace
            },

            // 拓展值
            appendValue: function (node, value, position) {
                if (!node) {
                    console.log("appendValue: wrong node!")
                    return
                }
                //console.log("appendValue:", node.name);
                if (node.childs.length == 0) {
                    this.createTextNode(node)
                }
                if (node.name == "bmath" || node.name == "imath") {
                    node.value += value
                } else if (node.mode == "block" || node.mode == "inline") {
                    node.childs[node.childs.length - 1].value += value
                }
            },

            // 拓展文本
            appendText: function (value, position) {
                var node = this.nodeplace
                //console.log("appendText:", node.mode, value);
                this.appendValue(node, value, position)
            },

            // 添加括号
            addBracket: function (bracket, position) {
                var parent, node, i
                switch (bracket) {
                    case "{":
                        if (this.nodelevel > 0) {
                            parent = this.nodeplace
                            //console.log("bracket:", node.name, node.argtype);
                            if (
                                parent.argarray.length < parent.argtype.length
                            ) {
                                for (
                                    i = parent.argarray.length;
                                    i < parent.argtype.length;
                                    i++
                                ) {
                                    if (
                                        parent.argtype[i] == "[]" ||
                                        parent.argtype[i] == "<>"
                                    ) {
                                        parent.argarray.push(null)
                                    } else break
                                }
                                i = parent.argarray.length
                                if (
                                    parent.argtype[i] == "{}" ||
                                    parent.argtype[i] == "{]"
                                ) {
                                    this.openChild("env", "{}", position, true)
                                    //console.log("bracket:", this.value, this.nodearray);
                                } else {
                                    // "||" for environment content
                                    if (parent.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position
                                        )
                                    }
                                    this.openChild("cmd", "group", position)
                                }
                                //console.log("bracket:", this.value, this.nodearray);
                                break
                            }
                        }
                        this.openChild("cmd", "group", position)
                        break
                    case "}":
                        if (this.nodelevel > 0) {
                            ;(node = this.nodeplace), (parent = node.parent)
                            if (node.name == "{}") {
                                node.to = position + 1
                                this.closeChild(position + 1)
                                if (
                                    parent.argtype[parent.argarray.length] ===
                                    "||"
                                ) {
                                    if (parent.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position + 1
                                        )
                                    } else {
                                        this.createTextNode(parent)
                                    }
                                    //console.log("bracket:", this.value, this.nodearray);
                                } else {
                                    node.to = position + 1
                                    //console.log("bracket:", this.value, this.nodearray);
                                    if (
                                        parent.argarray.length ==
                                        parent.argtype.length
                                    ) {
                                        parent.to = position + 1
                                        this.endGroup(
                                            parent.type,
                                            parent.name,
                                            parent.from,
                                            parent.to
                                        )
                                    }
                                }
                                break
                            } else if (node.name == "group") {
                                node.to = position + 1
                                this.closeChild(position + 1)
                                break
                            }
                        }
                        this.addText(this.value, position)
                        break
                    case "[":
                        if (this.nodelevel > 0) {
                            parent = this.nodeplace
                            if (
                                parent.argarray.length < parent.argtype.length
                            ) {
                                for (
                                    i = parent.argarray.length;
                                    i < parent.argtype.length;
                                    i++
                                ) {
                                    if (
                                        parent.argtype[i] == "{]" ||
                                        parent.argtype[i] == "<>"
                                    ) {
                                        parent.argarray.push(null)
                                    } else break
                                }
                                i = parent.argarray.length
                                if (parent.argtype[i] == "[]") {
                                    this.openChild("env", "[]", position, true)
                                    //console.log(this.value, this.nodearray);
                                } else if (parent.argtype[i] == "||") {
                                    if (parent.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position
                                        )
                                    }
                                    //console.log(this.value, this.nodearray);
                                } else if (parent.argtype[i] == "{}") {
                                    this.openChild("env", "{}", position, true)
                                    this.appendText("[", position)
                                    node.from = position + 1
                                    //console.log(this.value, this.nodearray);
                                    if (
                                        parent.argarray.length ==
                                        parent.argtype.length
                                    ) {
                                        this.endGroup(
                                            parent.type,
                                            parent.name,
                                            parent.from,
                                            parent.to
                                        )
                                    }
                                }
                                break
                            }
                        }
                        this.addText(this.value, position)
                        break
                    case "]":
                        if (this.nodelevel > 0) {
                            ;(node = this.nodeplace), (parent = node.parent)
                            if (node.name == "[]") {
                                node.to = position + 1
                                this.closeChild(position + 1)
                                if (
                                    parent.argtype[node.argarray.length] ===
                                    "||"
                                ) {
                                    if (parent.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position + 1
                                        )
                                    } else {
                                        this.createTextNode(parent)
                                    }
                                    //console.log(this.value, this.nodearray);
                                } else {
                                    node.to = position + 1
                                    //console.log(this.value, this.nodearray);
                                    if (
                                        parent.argarray.length ==
                                        parent.argtype.length
                                    ) {
                                        parent.to = position + 1
                                        this.endGroup(
                                            parent.type,
                                            parent.name,
                                            parent.from,
                                            parent.to
                                        )
                                    }
                                }
                                break
                            }
                        }
                        this.addText(this.value, position)
                        break
                    case "<":
                        if (this.nodelevel > 0) {
                            parent = this.nodeplace
                            if (
                                parent.argarray.length < parent.argtype.length
                            ) {
                                for (
                                    i = parent.argarray.length;
                                    i < parent.argtype.length;
                                    i++
                                ) {
                                    if (
                                        parent.argtype[i] == "{]" ||
                                        parent.argtype[i] == "[]"
                                    ) {
                                        parent.argarray.push(null)
                                    } else break
                                }
                                i = parent.argarray.length
                                if (parent.argtype[i] == "<>") {
                                    this.openChild("env", "<>", position, true)
                                } else if (parent.argtype[i] == "||") {
                                    if (parent.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position
                                        )
                                    }
                                } else if (parent.argtype[i] == "{}") {
                                    this.openChild("env", "{}", position, true)
                                    this.appendText("<", position)
                                    parent.to = posiiton + 1
                                    if (
                                        parent.argarray.length ==
                                        parent.argtype.length
                                    ) {
                                        this.endGroup(
                                            parent.type,
                                            parent.name,
                                            parent.from,
                                            parent.to
                                        )
                                    }
                                }
                                break
                            }
                        }
                        this.addText("&iexcl;", position)
                        break
                    case ">":
                        if (this.nodelevel > 0) {
                            ;(node = this.nodeplace), (parent = node.parent)
                            if (node.name == "<>") {
                                node.to = position + 1
                                if (
                                    node.argtype[node.argarray.length] === "||"
                                ) {
                                    if (node.mode == "main") {
                                        this.openNewGroup(
                                            "env",
                                            "par",
                                            position + 1
                                        )
                                    } else {
                                        this.createTextNode(parent)
                                    }
                                } else {
                                    node.to = position + 1
                                    if (
                                        node.argarray.length ==
                                        node.argtype.length
                                    ) {
                                        parent.to = position + 1
                                        this.endGroup(
                                            node.type,
                                            node.name,
                                            node.from,
                                            node.to
                                        )
                                    }
                                }
                                break
                            }
                        }
                        this.addText("&iquest;", position)
                        break
                }
            },

            // 添加文本
            addText: function (value, position) {
                //if (arguments.length == 1) console.log("no position for " + value);
                //console.log("addtext: start for", this.nodeplace.name, this.nodeplace.argtype, value);
                if (this.nodelevel > 0) {
                    var n = value.length
                    var node = this.nodeplace
                    if (node.argarray.length == node.argtype.length) {
                        this.appendText(value, position)
                    } else {
                        var i = node.argarray.length
                        while (i < node.argtype.length && value) {
                            //console.log("addtext:", node.name);
                            //console.log("addtext:", node.argtype[i]);
                            if (node.argtype[i] == "||") {
                                if (node.mode == "main") {
                                    this.openNewGroup(
                                        "env",
                                        "par",
                                        position + n - value.length
                                    )
                                }
                                this.appendText(
                                    value,
                                    position + n - value.length
                                )
                                value = ""
                                return
                            } else if (node.argtype[i] == "{}") {
                                this.openChild(
                                    "env",
                                    "{}",
                                    position + n - value.length,
                                    true
                                )
                                this.appendText(
                                    value.charAt(0),
                                    position + n - value.length
                                )
                                value = value.substring(1)
                            } else {
                                node.argarray.push(null)
                            }
                            i++
                        }
                        //console.log("addtext:", node.name);
                        node.to = position + n - value.length
                        if (node.argarray.length == node.argtype.length) {
                            this.endGroup(
                                node.type,
                                node.mode,
                                node.from,
                                node.to
                            )
                            if (value) {
                                this.addText(value, node.to)
                            }
                        } else if (value) {
                            console.log("addText: value is not empty!")
                            this.addText(value, position + n - value.length)
                        }
                    }
                } else {
                    console.log("addText: nodelevel is zero!")
                    this.addText(value, position)
                }
            },

            // test if group1 could include group2
            includeGroup: function (name1, name2) {
                var same1, same2, mode1, mode2
                same1 = this.getGroupSame(name1)
                same2 = this.getGroupSame(name2)
                mode1 = this.getGroupMode(same1)
                mode2 = this.getGroupMode(same2)
                if (same2 == "section") return false
                if (
                    (same1 == "enumerate" || same1 == "itemize") &&
                    same2 == "item"
                )
                    return true
                if (same1 == "tabular" || mode2 == "inline") return true
                if (same1 == "item" && same2 == "item") return false
                if (mode1 == "block" && same2 == "bmath") return true
                if (
                    (mode1 == "block" && mode2 != "inline") ||
                    mode1 == "inline"
                ) {
                    console.log("includeGroup:", name1, name2, false)
                    return false
                }
                var out = this.getGroupOuts(same2)
                if (out) {
                    for (i = 0; i < out.length; i++) {
                        if (out[i] == same1) return false
                    }
                }
                return true
            },

            // 获取参数类型
            getArgsType: function (type, name) {
                var same = this.getGroupSame(name),
                    group,
                    args
                if (type == "env") {
                    group = this.definitions.find("environment", same)
                    args = group && "args" in group ? group.args : ["||"]
                } else {
                    group = this.definitions.find("command", same)
                    args = group && "args" in group ? group.args : []
                }
                return args
            },

            getGroupOuts: function (same) {
                var group =
                    this.definitions.find("environment", same) ||
                    this.definitions.find("command", same)
                if (group) return group.outs
            },

            // 获取组模式
            getGroupMode: function (name) {
                var same = this.getGroupSame(name)
                var group =
                    this.definitions.find("environment", same) ||
                    this.definitions.find("command", same)
                var mode = group ? group.mode : "inline"
                return mode
            },

            getGroupSame: function (name) {
                var same =
                    this.definitions.find("environment", name) ||
                    this.definitions.find("command", name)
                if (typeof same == "string") return same
                return name
            },

            // 读取参数
            readParameters: function (node) {
                var arg = node.argarray,
                    result = [],
                    a,
                    v
                for (var i = 0; i < arg.length; i++) {
                    a = arg[i]
                    if (a && a.childs.length) {
                        v = a.childs[0].value
                    } else {
                        v = null
                    }
                    result.push(v)
                }
                return result
            },

            // 添加包
            addPackage: function (pkg) {
                var info = packages.info,
                    list = packages.list,
                    used = list.used,
                    current = list.current,
                    missing = list.missing,
                    existing = list.existing
                for (var j = 0; j < current.length; j++) {
                    if (pkg[0] == current[j][0]) return
                }

                var getfiles = function (that, pkgs) {
                    var i, p, f
                    for (i = 0; i < pkgs.length; i++) {
                        p = pkgs[i]
                        if (typeof p == "string") p = [p]
                        f = info[p[0]].file
                        if (f) that.addPackage([f].concat(p))
                    }
                }

                var name = pkg[1],
                    pre = info[name].pre
                if (pre) pre = getfiles(this, pre)

                current.push(pkg)
                for (j = 0; j < used.length; j++) {
                    if (pkg[0] == used[j][0]) break
                }
                if (j < used.length) {
                    existing.push(j)
                } else {
                    missing.push(pkg)
                }

                var post = info[name].post
                if (post) post = getfiles(this, post)
            },

            buildCounters: function () {
                var subcounters = (latex.subcounters = {}),
                    parent,
                    reset = "",
                    incre = ""
                $.each(latex.counters, function (name, value) {
                    if ((parent = value.parent)) {
                        subcounters[parent] = subcounters[parent] || ""
                        subcounters[parent] += " " + name
                    }
                })
                $.each(latex.counters, function (name, value) {
                    reset += " " + name
                    incre +=
                        ".the" + name + " {counter-increment: " + name + ";}\n"
                    incre +=
                        ".the" +
                        name +
                        ":before {content: " +
                        value.content +
                        ";}\n"
                })
                reset = "\nbody {counter-reset:" + reset + ";}\n"
                $.addStyles(reset + incre, "typejax-counter")
            },

            newCounter: function (name, parent) {
                var value = {
                    parent: parent,
                    content: "'\\0000a0' counter(" + name + ") '\\0000a0'",
                }
                latex.counters[name] = value
                this.buildCounters(name, value)
            },

            // TODO: 命题、公式
            makeTheorem: function (node) {
                if (node.childs.length == 0) return //fix for empty content in theorems
                var envname = node.name,
                    theorem = this.theorems[envname]
                if (!theorem) return
                var cname =
                        envname.slice(-1) == "*"
                            ? envname.slice(0, -1)
                            : envname,
                    thmhead = (thmname = theorem.thmname),
                    counter = theorem.counter,
                    star = theorem.star
                if (counter) {
                    thmhead += "<span class='the" + counter + "'></span>"
                } else if (!star) {
                    thmhead += "<span class='the" + cname + "'></span>"
                }
                if (node.argarray[0]) {
                    thmhead += " (" + node.argarray[0].childs[0].value + ")"
                    node.childs.splice(0, 1)
                }
                var textnode = {
                    type: "env",
                    name: "thmhead",
                    mode: "inline",
                    from: node.childs[0].from,
                    value: "<span>" + thmhead + " </span>",
                    parent: node.childs[0],
                    childs: [],
                }
                node.childs[0].childs.splice(0, 0, textnode)
                node.name = "theorem"
            },

            // 定义
            definitions: {
                cache: { environment: {}, command: {} },
                clear: function () {
                    this.cache = { environment: {}, command: {} }
                },
                find: function (type, name) {
                    var result = this.cache[type][name]
                    if (result) return result
                    var used = packages.list.used
                    for (var i = used.length - 1; i >= 0; i--) {
                        var pkgname = used[i][0]
                        if (
                            (result = latex[pkgname]["definitions"][type][name])
                        )
                            break
                    }
                    this.cache[type][name] = result =
                        result || latex["article"]["definitions"][type][name]
                    return result
                },
            },
            // 渲染器
            renderers: {
                cache: { env: {}, cmd: {} },
                clear: function () {
                    this.cache = { env: {}, cmd: {} }
                },
                find: function (type, name) {
                    if (name.slice(-1) == "*") name = name.slice(0, -1)
                    var result = this.cache[type][name]
                    if (result) return result
                    var used = packages.list.used
                    var func =
                        type + name.charAt(0).toUpperCase() + name.slice(1)
                    for (var i = used.length - 1; i >= 0; i--) {
                        var pkgname = used[i][0]
                        if ((result = latex[pkgname]["renderers"][func])) break
                    }
                    this.cache[type][name] = result =
                        result || latex["article"]["renderers"][func]
                    return result
                },
            },
        }

        // latex对象
        var latex = {
            // cmd的值
            cmdvalues: {
                documentclass: "article",
            },
            // counters
            counters: {
                theorem: { content: "'\\0000a0' counter(theorem) '\\0000a0'" },
            },
            // subconters
            subcounters: {},
            theorems: {
                theorem: { thmname: "Theorem", counter: "theorem" },
            },
            identifier: 0,
        }

        // 拓展
        var extend = function (
            pkgfile,
            definitions,
            renderers,
            styles,
            counters
        ) {
            latex[pkgfile] = {
                definitions: definitions,
                renderers: renderers,
            }
            if (styles) {
                var content = ""
                $.each(styles, function (selector, style) {
                    content += selector + " {\n"
                    $.each(style, function (property, value) {
                        content += "  " + property + ": " + value + ";\n"
                    })
                    content += "}\n"
                })
                $.addStyles(
                    content,
                    "typejax-package-" + pkgfile.replace(/\//g, "-")
                )
            }
            if (counters) {
                $.each(counters, function (key, value) {
                    latex.counters[key] = value
                })
                syner.buildCounters()
            }
        }

        /**
         * group.mode
         * main组可以包含main和block组
         * block组可以包含inline组和bmath元素
         * inline组可以包含inline commands和itext/imath元素
         * bmath元素应当被直接显示为math
         * imath元素应该直接包含行内数学
         */
        // group.outs: 列出不能被包含

        ;(function () {
            // 定义
            var definitions = {
                // 命令
                command: {
                    // 作者
                    author: { mode: "inline", args: ["[]", "{}"] },
                    // 章节
                    chapter: "section",
                    // 取消章节
                    "chapter*": "section",
                    // 日期
                    date: { mode: "inline", args: ["{}"] },
                    // 文档类
                    documentclass: { mode: "inline", args: ["[]", "{}"] },
                    // 组
                    group: { mode: "inline", args: ["{}"] },
                    // maketitle
                    maketitle: { mode: "block", args: [] },
                    // newcounter
                    newcounter: { mode: "inline", args: ["{}", "[]"] },
                    // 定理？
                    newtheorem: {
                        mode: "inline",
                        args: ["{}", "[]", "{}", "[]"],
                    },
                    // 取消定理
                    "newtheorem*": { mode: "inline", args: ["{}", "{}"] },
                    // 段落
                    paragraph: { mode: "inline", args: ["[]", "{}"] },
                    "paragraph*": "paragraph",
                    // 部分
                    part: "section",
                    "part*": "section",
                    // 章节
                    section: { mode: "block", args: ["[]", "{}"] },
                    "section*": "section",
                    // 子段落
                    subparagraph: "paragraph",
                    "subparagraph*": "paragraph",
                    // 子章节
                    subsection: "section",
                    "subsection*": "section",
                    // 孙章节
                    subsubsection: "section",
                    "subsubsection*": "section",
                    // 表格tableofcontents
                    tableofcontents: {
                        mode: "block",
                        args: ["[]"],
                        outs: ["par"],
                    },
                    // textbf
                    textbf: { mode: "inline", args: ["{}"] },
                    // thanks
                    thanks: { mode: "inline", args: ["{}"] },
                    // 标题
                    title: { mode: "inline", args: ["[]", "{}"] },
                    // 使用包
                    usepackage: { mode: "inline", args: ["[]", "{}"] },
                },
                // 环境
                environment: {
                    // bmath
                    bmath: { mode: "block" },
                    // center,居中?
                    center: {
                        mode: "main",
                        args: ["||"],
                        outs: ["par", "center"],
                    },
                    // 列表
                    enumerate: { mode: "block", args: ["[]", "||"] },
                    // 子项
                    item: { mode: "main", args: ["<>", "||"] },
                    // 逐项
                    itemize: { mode: "block", args: ["[]", "||"] },
                    // par?
                    par: {
                        mode: "block",
                        args: ["||"],
                        outs: ["par", "section"],
                    },
                    // preamble
                    preamble: { mode: "main", args: ["||"] },
                    // tabular
                    tabular: { mode: "inline", args: ["{}", "||"] },
                    // 定理
                    theorem: {
                        mode: "main",
                        args: ["[]", "||"],
                        outs: ["par", "theorem"],
                    },
                    // verbatim
                    verbatim: { mode: "block", args: ["||"], outs: ["par"] },
                },
            }

            // TODO: 渲染器
            var renderers = {
                cmdAuthor: function (node) {
                    this.renderers.find("cmd", "title").call(this, node)
                },

                cmdDate: function (node) {
                    this.renderers.find("cmd", "title").call(this, node)
                },

                cmdDocumentclass: function (node) {
                    var parameters = this.readParameters(node),
                        info = packages.info,
                        list = packages.list,
                        docoptn = parameters[0]
                            ? parameters[0].split(/ *, */)
                            : [],
                        docname = parameters[1],
                        docinfo
                    ;(list.current = []),
                        (list.missing = []),
                        (list.existing = [])
                    if (docname && (docinfo = info[docname])) {
                        this.addPackage([docinfo.file, docname].concat(docoptn))
                    } else {
                        docname = "article"
                    }
                    latex.cmdvalues["documentclass"] = docname

                    if (window.jaxedit) {
                        var display =
                            docname == "beamer" ? "inline-block" : "none"
                        jaxedit.childs.presbtn.style.display = display
                    }
                },

                cmdHline: function () {
                    return
                },

                cmdMaketitle: function (node) {
                    if (typeof this.cmdvalues["title"] == "undefined") return
                    var result = "<h1>" + this.cmdvalues["title"] + "</h1>"

                    if (typeof this.cmdvalues["author"] == "undefined") {
                        this.cmdvalues["author"] = ""
                    }
                    result +=
                        "<div class='author'>" +
                        this.cmdvalues["author"] +
                        "</div>"
                    if (typeof this.cmdvalues["institute"] != "undefined") {
                        result +=
                            "<div class='institute'>" +
                            this.cmdvalues["institute"] +
                            "</div>"
                    }
                    if (typeof this.cmdvalues["date"] == "undefined") {
                        result +=
                            "<div class='date'>" +
                            new Date().toLocaleDateString() +
                            "</div>"
                    } else {
                        result +=
                            "<div class='date'>" +
                            this.cmdvalues["date"] +
                            "</div>"
                    }

                    if (
                        node.name == "maketitle" &&
                        this.cmdvalues["documentclass"] == "beamer"
                    ) {
                        result =
                            "<div class='envblock frame'>" + result + "</div>"
                    }

                    node.childs = []
                    node.value = result
                },

                cmdNewcounter: function (node) {
                    var parameters = this.readParameters(node),
                        name = parameters[0],
                        parent = parameters[1] || null
                    if (name) {
                        this.newCounter(name, parent)
                    }
                },

                cmdNewline: function () {
                    this.addText("<br>", this.place - 1)
                },

                cmdNewtheorem: function (node) {
                    // \newtheorem{envname}{thmname}[numberby]
                    // \newtheorem{envname}[counter]{thmname}
                    // \newtheorem*{envname}{thmname}
                    var csname = node.name,
                        parameters = this.readParameters(node)
                    var envname = parameters[0]
                    if (!envname) return
                    var thmname, numberby, counter, theorem
                    if (csname == "newtheorem") {
                        counter = parameters[1]
                        thmname = parameters[2]
                        numberby = parameters[3]
                        if (thmname) {
                            theorem = this.theorems[envname]
                            if (!theorem || theorem.thmname != thmname)
                                delayReload()
                            this.theorems[envname] = { thmname: thmname }
                            if (envname != "theorem") {
                                latex["article"]["definitions"]["environment"][
                                    envname
                                ] = "theorem"
                            }
                            if (numberby) {
                                this.newCounter(envname, numberby)
                            } else if (counter) {
                                this.theorems[envname].counter = counter
                            } else {
                                this.newCounter(envname, null)
                            }
                        }
                    } else {
                        // newtheorem*
                        thmname = parameters[1]
                        if (thmname) {
                            theorem = this.theorems[envname]
                            if (!theorem || theorem.thmname != thmname)
                                delayReload()
                            this.theorems[envname] = {
                                thmname: thmname,
                                star: true,
                            }
                            if (envname != "theorem") {
                                latex["article"]["definitions"]["environment"][
                                    envname
                                ] = "theorem"
                            }
                        }
                    }
                },

                cmdParagraph: function (node) {
                    var csname = node.name,
                        argarray = node.argarray
                    switch (csname) {
                        case "paragraph":
                        case "paragraph*":
                            node.value = "<b>" + node.value + "</b>&nbsp;&nbsp;"
                            break
                        case "subparagraph":
                        case "subparagraph*":
                            node.value =
                                "&nbsp;&nbsp;&nbsp;<b>" +
                                node.value +
                                "</b>&nbsp;&nbsp;"
                            break
                    }
                },

                cmdQquad: function () {
                    if (this.mathenv != "") {
                        this.addText("\\" + this.value, this.place - 1)
                    } else {
                        this.addText(
                            "<span class='qquad'></span>",
                            this.place - 1
                        )
                    }
                },

                cmdQuad: function () {
                    if (this.mathenv != "") {
                        this.addText("\\" + this.value, this.place - 1)
                    } else {
                        this.addText(
                            "<span class='quad'></span>",
                            this.place - 1
                        )
                    }
                },

                // TODO: cmdSection
                cmdSection: function (node) {
                    var csname = node.name,
                        argarray = node.argarray
                    var sectintoc, anchor
                    var value1 = typejax.builder(argarray[1], false),
                        value0 = argarray[0]
                            ? typejax.builder(argarray[0], false)
                            : ""
                    if (csname.slice(-1) == "*") {
                        node.name = csname.slice(0, -1) + "-s"
                        node.value = "<span>" + value1 + "</span>"
                    } else {
                        sectintoc = value0 ? value0 : value1
                        anchor = "typejax-identifier-" + ++latex.identifier
                        typejax.innersect.push([
                            syner.innertree.childs.length,
                            csname,
                            sectintoc,
                            anchor,
                        ])
                        node.value =
                            "<span class='the" +
                            csname +
                            "' id='" +
                            anchor +
                            "'></span><span>" +
                            value1 +
                            "</span>"
                        node.reset = latex.subcounters[csname] || undefined
                    }
                    node.childs = []
                },

                cmdTableofcontents: function (node) {
                    node.childs = []
                    node.value = "<div id='tableofcontents'></div>"
                },

                cmdTextbackslash: function () {
                    this.addText("\\", this.place - 1)
                },

                cmdTextbar: function () {
                    this.addText("|", this.place - 1)
                },

                cmdTextbf: function (node) {
                    if (node.argarray[0].childs[0]) {
                        node.value =
                            "<b>" + node.argarray[0].childs[0].value + "</b>"
                        node.childs = []
                    }
                },

                cmdTextgreater: function () {
                    this.addText("&gt;", this.place - 1)
                },

                cmdTextless: function () {
                    this.addText("&lt;", this.place - 1)
                },

                cmdTitle: function (node) {
                    var csname = node.name,
                        argarray = node.argarray
                    var argnode,
                        child,
                        i,
                        value = ""
                    switch (csname) {
                        case "title":
                        case "author":
                            argnode = argarray[1]
                            break
                        default:
                            argnode = argarray[0]
                    }
                    for (i = 0; i < argnode.childs.length; i++) {
                        child = argnode.childs[i]
                        if (child.name == "imath") {
                            value += typejax.builder(child, true)
                        } else {
                            value += child.value
                        }
                    }
                    this.cmdvalues[csname] = value
                    node.childs = []
                },

                cmdUsepackage: function (node) {
                    var parameters = this.readParameters(node),
                        pkgoptn = parameters[0]
                            ? parameters[0].split(/ *, */)
                            : [],
                        pkgname = parameters[1],
                        pkginfo
                    if (pkgname) {
                        pkgname = pkgname.split(/ *, */)
                        for (var i = 0; i < pkgname.length; i++) {
                            if ((pkginfo = packages.info[pkgname[i]]))
                                this.addPackage(
                                    [pkginfo.file, pkgname[i]].concat(pkgoptn)
                                )
                        }
                    }
                },

                envEnumerate: function (node) {
                    this.renderers.find("env", "itemize").call(this, node)
                },

                envItemize: function (node) {
                    // itemize, enumerate
                    if (node.childs.length == 0) return //fix for empty content in lists
                    if (node.childs[0].mode == "inline") node.childs.shift()
                },

                envPreamble: function (node) {
                    var list = packages.list,
                        used = list.used,
                        current = list.current,
                        missing = list.missing,
                        existing = list.existing
                    var pending = missing.length
                    if (pending) {
                        stop()
                        for (i = 0; i < pending; i++) {
                            $.loadScript(
                                base + "package/" + missing[i][0] + ".js",
                                function () {
                                    pending--
                                    if (!pending) {
                                        updatePackages(this)
                                        reload()
                                    }
                                },
                                this
                            )
                        }
                    } else if (existing.length < used.length) {
                        stop()
                        setTimeout(updatePackages, 0, this)
                        setTimeout(reload, 0)
                    }

                    function updatePackages(that) {
                        for (var j = 0; j < used.length; j++) {
                            if ($.inArray(j, existing) == -1) {
                                var p = used[j][0]
                                delete latex[p]
                                $.removeStyles(
                                    "typejax-package-" + p.replace(/\//g, "-")
                                )
                            }
                        }
                        list.used = current
                        console.log("usepackages", list.used)
                        that.definitions.clear()
                        that.renderers.clear()
                    }
                },

                envTabular: function (node) {
                    var o = "",
                        i,
                        child
                    node.childs.shift()
                    for (i = 0; i < node.childs.length; i++) {
                        child = node.childs[i]
                        if (child.name == "imath") {
                            o += typejax.builder(child, true)
                        } else {
                            o += child.value
                        }
                    }
                    node.childs = []
                    while (o.charAt(o.length - 1) == " ") {
                        o = o.substring(0, o.length - 1)
                    }
                    if (o.substring(o.length - 8, o.length) == "<tr><td>") {
                        o =
                            "<table border='1'><tbody><tr><td>" +
                            o.substring(0, o.length - 8) +
                            "</tbody></table>"
                    } else {
                        o =
                            "<table border='1'><tbody><tr><td>" +
                            o +
                            "</td></tr></tbody></table>"
                    }
                    node.value =
                        "<span class='" +
                        node.name +
                        "' style='display:inline-block;'>" +
                        o +
                        "</span>"
                    this.intabular = false
                },

                envTheorem: function (node) {
                    this.makeTheorem(node)
                },
            }

            var counters = {
                part: {
                    content:
                        "'Part ' counter(part, upper-roman) '\\0000a0\\0000a0'",
                },
                chapter: {
                    content: "'Chapter ' counter(chapter) '\\0000a0\\0000a0'",
                },
                section: {
                    parent: "chapter",
                    content: "counter(section) '\\0000a0'",
                },
                subsection: {
                    parent: "section",
                    content:
                        "counter(section) '.' counter(subsection) '\\0000a0'",
                },
                subsubsection: {
                    parent: "subsection",
                    content:
                        "counter(section) '.' counter(subsection) '.' counter(subsubsection) '\\0000a0'",
                },
                "-toc-part": {
                    content:
                        "'Part ' counter(-toc-part, upper-roman) '\\0000a0\\0000a0'",
                },
                "-toc-chapter": {
                    content:
                        "'Chapter ' counter(-toc-chapter) '\\0000a0\\0000a0'",
                },
                "-toc-section": {
                    parent: "-toc-chapter",
                    content: "counter(-toc-section) '\\0000a0'",
                },
                "-toc-subsection": {
                    parent: "-toc-section",
                    content:
                        "counter(-toc-section) '.' counter(-toc-subsection) '\\0000a0'",
                },
                "-toc-subsubsection": {
                    parent: "-toc-subsection",
                    content:
                        "counter(-toc-section) '.' counter(-toc-subsection) '.' counter(-toc-subsubsection) '\\0000a0'",
                },
            }

            extend("article", definitions, renderers, null, counters)
        })()

        // TODO: 包
        var packages = {
            info: {
                amsart: { file: "amscls/amscls" },
                amsbook: { file: "amscls/amscls" },
                beamer: {
                    file: "beamer/beamer",
                    pre: ["hyperref"],
                    post: ["beamerthemedefault"],
                },
                beamercolorthemebeaver: { file: "beamer/color/beaver" },
                beamercolorthemedefault: { file: "beamer/color/default" },
                beamercolorthemelily: { file: "beamer/color/lily" },
                beamercolorthemeorchid: { file: "beamer/color/orchid" },
                beamercolorthemerose: { file: "beamer/color/rose" },
                beamercolorthemewhale: { file: "beamer/color/whale" },
                beamercolorthemewolverine: { file: "beamer/color/wolverine" },
                beamerfontthemedefault: { file: "beamer/font/default" },
                beamerfontthemeserif: { file: "beamer/font/serif" },
                beamerfontthemestructurebold: {
                    file: "beamer/font/structurebold",
                },
                beamerfontthemestructureitalicserif: {
                    file: "beamer/font/structureitalicserif",
                },
                beamerfontthemestructuresmallcapsserif: {
                    file: "beamer/font/structuresmallcapsserif",
                },
                beamerinnerthemecircles: { file: "beamer/inner/circles" },
                beamerinnerthemedefault: { file: "beamer/inner/default" },
                beamerinnerthemerectangles: { file: "beamer/inner/rectangles" },
                beamerinnerthemerounded: { file: "beamer/inner/rounded" },
                beamerouterthemedefault: { file: "beamer/outer/default" },
                beamerouterthemeinfolines: { file: "beamer/outer/infolines" },
                beamerthemeboxes: {
                    file: "beamer/theme/boxes",
                },
                beamerthemedefault: {
                    file: "beamer/theme/default",
                    pre: [
                        "beamerinnerthemedefault",
                        "beamercolorthemedefault",
                        "beamerfontthemedefault",
                        "beamerouterthemedefault",
                    ],
                },
                beamerthemeepyt: { file: "beamer/theme/epyt" },
                beamerthemeAnnArbor: {
                    file: "beamer/theme/AnnArbor",
                    pre: [
                        "beamerinnerthemerounded",
                        "beamercolorthemewolverine",
                        "beamerouterthemeinfolines",
                    ],
                },
                beamerthemeBoadilla: {
                    file: "beamer/theme/Boadilla",
                    pre: [
                        "beamerinnerthemerounded",
                        "beamercolorthemerose",
                        "beamerouterthemeinfolines",
                    ],
                },
                beamerthemeCambridgeUS: {
                    file: "beamer/theme/CambridgeUS",
                    pre: [
                        "beamerinnerthemerounded",
                        "beamercolorthemebeaver",
                        "beamerouterthemeinfolines",
                    ],
                },
                beamerthemeMadrid: {
                    file: "beamer/theme/Madrid",
                    pre: [
                        "beamerinnerthemerounded",
                        "beamercolorthemeorchid",
                        "beamercolorthemewhale",
                        "beamerouterthemeinfolines",
                    ],
                },
                beamerthemePittsburgh: {
                    file: "beamer/theme/Pittsburgh",
                },
                beamerthemeRochester: {
                    file: "beamer/theme/Rochester",
                    pre: [
                        "beamerinnerthemerectangles",
                        "beamercolorthemeorchid",
                        "beamercolorthemewhale",
                    ],
                },
                ctex: { file: "ctex/ctex" },
                ctexart: { file: "ctex/ctex" },
                ctexbook: { file: "ctex/ctex" },
                ctexcap: { file: "ctex/ctex" },
                hyperref: { file: "hyperref/hyperref" },
            },
            list: { used: [], current: [], missing: [], existing: [] },
        }

        // 开始
        function start() {
            console.log("---------------- start parser ----------------")
            // 分析
            syner.analysis(input, modstart, modend)
            // 打印树
            syner.printTree(syner.innertree)
            // 内部树子节点获取
            var childs = syner.innertree.childs,
                out = [],
                child,
                i
            for (i = 0; i < childs.length; i++) {
                child = childs[i]
                that.builder.reset = ""
                out.push({
                    from: child.from,
                    to: child.to,
                    name: child.name,
                    html: that.builder(child, false),
                    reset: that.builder.reset,
                })
            }
            console.log("output:", out)
            return out
        }

        // 停止
        function stop() {
            console.log("---------------- stop parser ----------------")
            lexer.ended = true
            done = false
        }

        // 加载
        function load(input1, modstart1, modend1, callback1) {
            input = input1
            modstart = modstart1
            modend = modend1
            callback = callback1
            if (time && new Date().getTime() - time > 2000) {
                time = null
                return callback(null)
            }
            done = true
            var out = start()
            if (done) {
                callback(out)
            }
        }

        // 重新加载
        function reload() {
            callback(null)
        }

        // 延时加载
        function delayReload() {
            time = new Date().getTime()
        }

        return { latex: latex, load: load, extend: extend }
    })(typejax)

    // TODO: builder
    typejax.builder = function (tree, flag) {
        // open close html
        var open,
            close,
            html = ""
        if (tree.reset) this.builder.reset += tree.reset
        if (flag) {
            if (tree.mode == "inline") {
                ;(open = "<span class='" + tree.name + "'>"),
                    (close = "</span>")
                if (tree.name == "imath") {
                    open +=
                        "<span class='MathJax_Preview'>" +
                        $.escapeText(tree.value) +
                        "</span>"
                    ;(open += "<script type='math/tex'>"),
                        (close = "</script>" + close)
                }
            } else {
                ;(open = "<div class='envblock " + tree.name + "'>"),
                    (close = "</div>")
                switch (tree.name) {
                    case "bmath":
                        open +=
                            "<div class='MathJax_Preview'>" +
                            $.escapeText(tree.value) +
                            "</div>"
                        ;(open += "<script type='math/tex; mode=display'>"),
                            (close = "</script>" + close)
                        break
                    case "enumerate":
                        ;(open += "<ol>"), (close = "</ol>" + close)
                        break
                    case "itemize":
                        ;(open += "<ul>"), (close = "</ul>" + close)
                        break
                    case "item":
                        ;(open = "<li>"), (close = "</li>")
                        break
                }
            }
        } else {
            switch (tree.name) {
                case "bmath":
                    open =
                        "<div class='MathJax_Preview'>" +
                        $.escapeText(tree.value) +
                        "</div>"
                    ;(open += "<script type='math/tex; mode=display'>"),
                        (close = "</script>")
                    break
                case "enumerate":
                    ;(open = "<div><ol>"), (close = "</ol></div>")
                    break
                case "itemize":
                    ;(open = "<div><ul>"), (close = "</ul></div>")
                    break
                case "item":
                    ;(open = "<li>"), (close = "</li>")
                    break
                default:
                    ;(open = ""), (close = "")
            }
            flag = true
        }
        if (tree.childs.length > 0) {
            for (var i = 0; i < tree.childs.length; i++) {
                html += this.builder(tree.childs[i], flag)
            }
        } else {
            html = tree.value
        }
        if (
            tree.mode == "inline" &&
            tree.childs.length == 0 &&
            tree.value == ""
        ) {
            return ""
        } else {
            return open + html + close
        }
    }

    // TODO: 消息处理
    typejax.message = {
        debug: "none",

        log: function (type) {
            var msg = Array.prototype.slice.call(arguments, 1).join(" ")
            var sto = this.storage
            sto[type] = sto[type] ? sto[type] + "\n" + msg : msg
            if (this.debug == "all" || this.debug.indexOf(type) > -1)
                console.log(msg)
        },

        get: function (type) {
            return this.storage[type] || ""
        },

        print: function (type) {
            console.log(this.storage[type] || "")
        },

        clear: function (type) {
            delete this.storage[type]
        },

        storage: {},
    }

    return typejax
})(inliner)

/**
 * 贵客率计算器模块
 * Guest Rate Calculator Module
 * 
 * @version 1.0.0
 * @description 独立的贵客率计算模块，负责处理所有与贵客率计算相关的逻辑
 * 
 * @dependencies
 * - jQuery (必需)
 * - Bootstrap Selectpicker (必需)
 * - CalCustomRule 全局对象 (必需)
 * - food.min.js 中的辅助函数:
 *   - updateEquipmentEffect()
 *   - getAmberDisplayByLevel()
 *   - calCustomResults()
 * 
 * @author foodgame-local
 * @license MIT
 */

var GuestRateCalculator = (function($) {
    'use strict';
    
    // ========================================
    // 私有变量
    // ========================================
    
    /**
     * 星级对应的最低份数要求
     */
    var MIN_QUANTITY_MAP = {
        1: 20,  // 1星最低20份
        2: 15,  // 2星最低15份
        3: 12,  // 3星最低12份
        4: 10,  // 4星最低10份
        5: 7    // 5星最低7份
    };
    
    /**
     * 品级对应的符文率
     */
    var RUNE_RATE_MAP = {
        "1": 50,  // 可级 50%
        "2": 51,  // 优级 51%
        "3": 52,  // 特级 52%
        "4": 53,  // 神级 53%
        "5": 53   // 传级 53%
    };
    
    /**
     * 品级数字到中文的映射
     */
    var QUALITY_LEVEL_NAMES = {
        "1": "可",
        "2": "优",
        "3": "特",
        "4": "神",
        "5": "传"
    };
    
    /**
     * 符文列表常量
     */
    var GOLD_RUNES = ['恐怖利刃', '鼓风机', '蒸馏杯', '千年煮鳖', '香烤鱼排', '五星炒果'];
    var SILVER_RUNES = ['刀嘴鹦鹉', '一昧真火', '蒸汽宝石', '耐煮的水草', '焦虫', '暖石'];
    var BRONZE_RUNES = ['剪刀蟹', '油火虫', '蒸汽耳环', '防水的柠檬', '烤焦的菊花', '五香果'];
    var ALL_RUNES = [].concat(GOLD_RUNES, SILVER_RUNES, BRONZE_RUNES);
    
    // ========================================
    // 私有函数 - 输入验证
    // ========================================
    
    /**
     * 验证份数输入
     * @private
     * @param {jQuery} input - jQuery 输入框对象
     */
    function validateQuantity(input) {
        var val = parseInt(input.val()) || 1;
        if (val < 1) {
            input.val(1);
        } else if (val > 999) {
            input.val(999);
        }
    }
    
    /**
     * 验证贵客率输入
     * @private
     * @param {jQuery} input - jQuery 输入框对象
     */
    function validateGuestRate(input) {
        var val = parseInt(input.val()) || 0;
        if (val < 0) {
            input.val(0);
        } else if (val > 999) {
            input.val(999);
        }
    }
    
    // ========================================
    // 私有函数 - 核心计算
    // ========================================
    
    /**
     * 根据星级和份数计算实际贵客率
     * @private
     * @param {number} starLevel - 星级 (1-5)
     * @param {number} quantity - 份数 (1-999)
     * @param {number} baseGuestRate - 基础贵客率 (%)
     * @returns {number} 实际贵客率 (%)
     */
    function calculateActualGuestRate(starLevel, quantity, baseGuestRate) {
        // 检查最低份数要求
        var minQuantity = MIN_QUANTITY_MAP[starLevel] || 7;
        
        if (quantity < minQuantity) {
            return 0.0;
        }
        
        // 根据星级计算实际贵客率
        var actualRate = 0;
        switch(starLevel) {
            case 1:
                actualRate = (0.05 + (quantity - 20) * 0.013) * (100 + baseGuestRate);
                break;
            case 2:
                actualRate = (0.08 + (quantity - 15) * 0.02) * (100 + baseGuestRate);
                break;
            case 3:
                actualRate = (0.083 + (quantity - 12) * 0.016) * (100 + baseGuestRate);
                break;
            case 4:
                actualRate = (0.1142 + (quantity - 10) * 0.0059) * (100 + baseGuestRate);
                break;
            case 5:
                actualRate = (0.1006 + (quantity - 7) * 0.0084) * (100 + baseGuestRate);
                break;
            default:
                actualRate = (0.1006 + (quantity - 7) * 0.0084) * (100 + baseGuestRate);
        }
        
        // 截断取整后除以100
        return Math.trunc(actualRate * 100.0) / 100.0;
    }
    
    /**
     * 根据品级计算符文率
     * @private
     * @param {string} rank - 品级 ("可", "优", "特", "神", "传")
     * @returns {number} 符文率 (%)
     */
    function getRuneRateByRank(rank) {
        var baseRuneRate = {
            "传": 53,
            "神": 53,
            "特": 52,
            "优": 51,
            "可": 50
        }[rank] || 50;
        
        return baseRuneRate;
    }
    
    /**
     * 计算百锅产出
     * @private
     * @param {number} actualGuestRate - 实际贵客率 (%)
     * @param {number} runeRate - 符文率 (%)
     * @param {number} critRate - 暴击率 (%)
     * @returns {number} 百锅产出
     */
    function calculateHundredPotOutput(actualGuestRate, runeRate, critRate) {
        if (actualGuestRate <= 0.0) {
            return 0.0;
        }
        
        var result = 0.01 * actualGuestRate * runeRate * critRate;
        return Math.trunc(result) / 100.0;
    }
    
    /**
     * 计算单位食材
     * @private
     * @param {number} actualGuestRate - 实际贵客率 (%)
     * @param {number} runeRate - 符文率 (%)
     * @param {number} critRate - 暴击率 (%)
     * @param {number} quantity - 份数
     * @returns {number} 单位食材
     */
    function calculateUnitFood(actualGuestRate, runeRate, critRate, quantity) {
        if (actualGuestRate <= 0.0 || quantity <= 0) {
            return 0.0;
        }
        
        var result = 0.1 / quantity * actualGuestRate * runeRate * critRate;
        return Math.trunc(result) / 100.0;
    }
    
    /**
     * 计算单位时间
     * @private
     * @param {number} unitFood - 单位食材
     * @param {number} timeRate - 时间效率 (%)
     * @returns {number} 单位时间
     */
    function calculateUnitTime(unitFood, timeRate) {
        if (unitFood <= 0.0 || timeRate <= 0.0) {
            return 0.0;
        }
        
        var result = unitFood * 100 / timeRate * 100;
        return Math.trunc(result) / 100.0;
    }
    
    /**
     * 格式化数字，去掉末尾的0
     * @private
     * @param {number} value - 要格式化的数字
     * @returns {string} 格式化后的字符串
     */
    function formatNumber(value) {
        return parseFloat(value.toFixed(2)).toString();
    }
    
    // ========================================
    // 公共函数
    // ========================================
    
    /**
     * 初始化贵客率计算器
     * 设置所有 UI 交互、事件监听器和验证逻辑
     * @public
     */
    function init() {
        // 初始化selectpicker
        $("#star-level").selectpicker();
        $("#quality-level").selectpicker();
        $("#star-level-2").selectpicker();
        $("#star-level-3").selectpicker();
        
        // 初始化厨师选择框的分类标签
        initChefCategoryTabs('chef');
        
        // 初始化厨具选择框的分类标签
        initChefCategoryTabs('equip');
        
        // 初始化菜谱选择框的分类标签
        initChefCategoryTabs('recipe');
        
        // 给所有份数输入框添加验证
        $("#quantity-value, #quantity-value-2, #quantity-value-3").on("input change", function() {
            validateQuantity($(this));
            // 触发正常营业计算，这会调用 updateCalSummaryDisplay 并更新贵客率计算器
            if (typeof calCustomResults === 'function') {
                calCustomResults();
            }
        });
        
        // 给贵客率输入框添加验证
        $("#guest-rate-input").on("input change", function() {
            validateGuestRate($(this));
        });
        
        // 监听星级和品级变化
        $("#star-level, #quality-level").on("changed.bs.select", function() {
            // 触发正常营业计算，这会调用 updateCalSummaryDisplay 并更新贵客率计算器
            if (typeof calCustomResults === 'function') {
                calCustomResults();
            }
        });
        
        // 折叠/展开按钮
        $(".guest-rate-calculator .btn-collapse").off("click").on("click", function() {
            $(this).closest(".guest-rate-calculator").toggleClass("collapsed");
        });
        
        // 数量加减按钮 - 主菜谱
        $("#quantity-plus").off("click").on("click", function() {
            var input = $("#quantity-value");
            var val = parseInt(input.val()) || 0;
            input.val(val + 1);
            if (typeof calCustomResults === 'function') {
                calCustomResults();
            }
        });
        
        $("#quantity-minus").off("click").on("click", function() {
            var input = $("#quantity-value");
            var val = parseInt(input.val()) || 0;
            if (val > 1) {
                input.val(val - 1);
                if (typeof calCustomResults === 'function') {
                    calCustomResults();
                }
            }
        });
        
        // 数量加减按钮 - 双菜谱1
        $("#quantity-plus-2").off("click").on("click", function() {
            var input = $("#quantity-value-2");
            var val = parseInt(input.val()) || 0;
            input.val(val + 1);
            calculateDualRecipe();
        });
        
        $("#quantity-minus-2").off("click").on("click", function() {
            var input = $("#quantity-value-2");
            var val = parseInt(input.val()) || 0;
            if (val > 1) {
                input.val(val - 1);
                calculateDualRecipe();
            }
        });
        
        // 数量加减按钮 - 双菜谱2
        $("#quantity-plus-3").off("click").on("click", function() {
            var input = $("#quantity-value-3");
            var val = parseInt(input.val()) || 0;
            input.val(val + 1);
            calculateDualRecipe();
        });
        
        $("#quantity-minus-3").off("click").on("click", function() {
            var input = $("#quantity-value-3");
            var val = parseInt(input.val()) || 0;
            if (val > 1) {
                input.val(val - 1);
                calculateDualRecipe();
            }
        });
        
        // 同贵客双菜谱按钮
        $("#sync-guest-double").off("click").on("click", function() {
            var section = $(".double-recipe-section");
            if (section.is(":visible")) {
                section.slideUp(300);
            } else {
                // 展开时，同步贵客率到输入框
                var guestRateText = $("#guest-rate-value").text();
                var guestRateValue = parseFloat(guestRateText.replace("%", "")) || 0;
                $("#guest-rate-input").val(guestRateValue);
                
                section.slideDown(300);
                // 展开后立即计算一次
                calculateDualRecipe();
            }
        });
        
        // 监听同贵客双菜谱区域的输入变化
        $("#guest-rate-input, #star-level-2, #quantity-value-2, #star-level-3, #quantity-value-3").on("change input", function() {
            calculateDualRecipe();
        });
    }
    
    /**
     * 计算贵客率结果（基础版本，用于简单场景）
     * 根据输入参数计算实际贵客率、符文率、百锅产出等
     * @public
     */
    function calculateResults() {
        // 获取输入值
        var baseGuestRate = parseFloat($("#guest-rate-input").val()) || 0;
        var starLevel = parseInt($("#star-level").val()) || 5;
        var qualityLevelValue = $("#quality-level").val() || "1";
        var quantity = parseInt($("#quantity-value").val()) || 7;
        
        // 将品级值转换为中文
        var qualityLevel = QUALITY_LEVEL_NAMES[qualityLevelValue] || "可";
        
        // 计算实际贵客率
        var actualGuestRate = calculateActualGuestRate(starLevel, quantity, baseGuestRate);
        
        // 计算符文率
        var runeRate = getRuneRateByRank(qualityLevel);
        
        // 暴击率固定为100（后续会根据厨师技能计算）
        var critRate = 100;
        
        // 计算百锅产出
        var hundredPotOutput = calculateHundredPotOutput(actualGuestRate, runeRate, critRate);
        
        // 计算单位食材
        var unitFood = calculateUnitFood(actualGuestRate, runeRate, critRate, quantity);
        
        // 计算单位时间（暂时使用100作为时间效率）
        var timeRate = 100;
        var unitTime = calculateUnitTime(unitFood, timeRate);
        
        // 更新显示
        $("#guest-rate-value").text(baseGuestRate.toFixed(2) + "%");
        $("#total-crit-rate").text(critRate.toFixed(2) + "%");
        $("#time-percentage").text("100%");
        $("#actual-guest-rate").text((Math.floor(actualGuestRate * 100) / 100).toFixed(2) + "%");
        $("#rune-rate").text(runeRate + "%");
        $("#hundred-pot-output").text(hundredPotOutput.toFixed(2));
        $("#unit-material").text(unitFood.toFixed(2));
        $("#unit-time").text(unitTime.toFixed(2));
    }
    
    /**
     * 计算同贵客双菜谱数据
     * 计算两个菜谱的组合贵客率和符文概率
     * @public
     */
    function calculateDualRecipe() {
        // 获取输入值
        var baseGuestRate = parseFloat($("#guest-rate-input").val()) || 0;
        var starLevel1 = parseInt($("#star-level-2").val()) || 5;
        var quantity1 = parseInt($("#quantity-value-2").val()) || 7;
        var starLevel2 = parseInt($("#star-level-3").val()) || 5;
        var quantity2 = parseInt($("#quantity-value-3").val()) || 7;
        
        // 计算实际贵客率1
        var actualGuestRate1 = calculateActualGuestRate(starLevel1, quantity1, baseGuestRate);
        
        // 计算实际贵客率2
        var actualGuestRate2 = calculateActualGuestRate(starLevel2, quantity2, baseGuestRate);
        
        // 计算总贵客率
        var totalGuestRate = actualGuestRate1 + actualGuestRate2;
        
        // 计算限制后的总贵客率（最大100）
        var limitedTotalGuestRate = totalGuestRate > 100.0 ? 100.0 : totalGuestRate;
        
        // 计算撒币概率：限制后的总贵客率 / 2，截断取整后除以100
        var scatterProbability = Math.floor(limitedTotalGuestRate / 2.0 * 100) / 100;
        
        // 计算符文A概率和符文B概率
        var runeAProbability = 0.0;
        var runeBProbability = 0.0;
        
        if ((actualGuestRate1 + actualGuestRate2) > 0) {
            // 符文A概率：实际贵客率1 / (实际贵客率1 + 实际贵客率2) * 限制后总贵客率 / 2
            var runeARaw = actualGuestRate1 / (actualGuestRate1 + actualGuestRate2) * limitedTotalGuestRate / 2.0;
            runeAProbability = Math.floor(runeARaw * 100) / 100;
            
            // 符文B概率：实际贵客率2 / (实际贵客率1 + 实际贵客率2) * 限制后总贵客率 / 2
            var runeBRaw = actualGuestRate2 / (actualGuestRate1 + actualGuestRate2) * limitedTotalGuestRate / 2.0;
            runeBProbability = Math.floor(runeBRaw * 100) / 100;
        }
        
        // 确保概率不为负数
        runeAProbability = runeAProbability < 0 ? 0.0 : runeAProbability;
        runeBProbability = runeBProbability < 0 ? 0.0 : runeBProbability;
        
        // 更新显示
        $("#actual-guest-rate-2").text((Math.floor(actualGuestRate1 * 100) / 100).toFixed(2) + "%");
        $("#actual-guest-rate-3").text((Math.floor(actualGuestRate2 * 100) / 100).toFixed(2) + "%");
        $("#rune-a-probability").text((Math.floor(runeAProbability * 100) / 100).toFixed(2) + "%");
        $("#rune-b-probability").text((Math.floor(runeBProbability * 100) / 100).toFixed(2) + "%");
        $("#scatter-probability").text((Math.floor(scatterProbability * 100) / 100).toFixed(2) + "%");
        
        // 总实际贵客率显示时，如果超过100则显示100，但保留原始值用于计算
        var displayTotalGuestRate = totalGuestRate > 100.0 ? 100.0 : totalGuestRate;
        $("#total-guest-rate").text((Math.floor(displayTotalGuestRate * 100) / 100).toFixed(2) + "%");
    }
    
    /**
     * 计算贵客率相关的所有字段
     * 包括厨师技能、修炼技能、厨具技能、心法盘技能的加成
     * @public
     * @param {Object} custom - 自定义配置对象（包含厨师、厨具、菜谱等信息）
     * @param {Object} rule - 规则对象（包含技能、七侠加成等信息）
     * @param {number} starLevel - 星级 (1-5)
     * @param {number} quantity - 份数 (1-999)
     * @param {string} qualityLevel - 品级 ("1"-"5")
     * @returns {Object} 包含所有计算字段的对象
     */
    function calculateFields(custom, rule, starLevel, quantity, qualityLevel) {
        var result = {
            guestRate: 0,           // 贵客率
            critRate: 100,          // 暴击率，初始100%
            timePercentage: 100,    // 时间百分比，初始100%
            actualGuestRate: 0,     // 实际贵客率
            runeRate: 0,            // 符文率
            hundredPotOutput: 0,    // 百锅产出
            unitMaterialOutput: 0,  // 单位食材
            unitTimeOutput: 0       // 单位时间
        };
        
        // 获取七侠加成数据
        var qixiaData = rule && rule.calQixiaData ? rule.calQixiaData : null;
        
        // 获取本地数据
        var localData = typeof getLocalData === 'function' ? getLocalData() : null;
        
        // 性能优化：缓存配置页面的已修炼厨师ID列表，避免重复DOM查询
        var configUltimatedIds = typeof getConfigUltimatedChefIds === 'function' ? getConfigUltimatedChefIds() : null;
        
        // 统计 特技符文率(GuestAntiqueDropRate) 技能
        var guestAntiqueDropRateSkills = [];
        
        // 遍历所有场上厨师
        for (var c in custom) {
            if (!custom[c].chef || !custom[c].chef.chefId) {
                continue;
            }
            
            var chef = custom[c].chef;
            var equip = custom[c].equip;
            var recipes = custom[c].recipes || [];
            
            // 判断该厨师是否已修炼（使用公共函数，传入缓存的 configUltimatedIds）
            var isUltimated = false;
            if (typeof isChefUltimated === 'function') {
                isUltimated = isChefUltimated(chef.chefId, localData, configUltimatedIds);
            } else {
                // 降级方案：如果函数不存在，使用简单判断
                isUltimated = (chef.ultimate === "是");
            }
            
            // 收集所有技能
            var allSkills = [];
            var skillSources = []; // 记录技能来源，用于获取描述
            
            // 1. 厨师技能
            if (chef.specialSkillEffect) {
                var chefSkillDesc = chef.specialSkillDisp || '';
                
                for (var i = 0; i < chef.specialSkillEffect.length; i++) {
                    allSkills.push(chef.specialSkillEffect[i]);
                    skillSources.push({
                        type: 'chef',
                        desc: chefSkillDesc
                    });
                }
            }
            
            // 2. 修炼技能（只有已修炼的厨师才收集）
            if (isUltimated && chef.ultimateSkillEffect) {
                for (var i = 0; i < chef.ultimateSkillEffect.length; i++) {
                    allSkills.push(chef.ultimateSkillEffect[i]);
                    skillSources.push({
                        type: 'ultimate',
                        desc: chef.ultimateSkillDisp || ''
                    });
                }
            }
            
            // 3. 厨具技能（需要考虑 MutiEquipmentSkill 的增强效果）
            if (equip && equip.effect) {
                // 使用 updateEquipmentEffect 来处理 MutiEquipmentSkill
                var equipEffect = equip.effect;
                // 只有已修炼的厨师才应用修炼技能对厨具的增强效果
                if (isUltimated && chef.ultimateSkillEffect && typeof updateEquipmentEffect === 'function') {
                    equipEffect = updateEquipmentEffect(equip.effect, chef.ultimateSkillEffect);
                }
                
                // 为每个厨具技能找到对应的技能描述
                for (var i = 0; i < equipEffect.length; i++) {
                    var skillDesc = '';
                    // 从技能数据库中查找对应的技能描述
                    if (equip.skill && rule.skills) {
                        for (var skillIdx = 0; skillIdx < equip.skill.length; skillIdx++) {
                            var skillId = equip.skill[skillIdx];
                            for (var s = 0; s < rule.skills.length; s++) {
                                if (rule.skills[s].skillId === skillId) {
                                    // 检查这个技能的effect中是否包含当前的equipEffect[i]
                                    for (var e = 0; e < rule.skills[s].effect.length; e++) {
                                        if (rule.skills[s].effect[e].type === equipEffect[i].type) {
                                            skillDesc = rule.skills[s].desc;
                                            break;
                                        }
                                    }
                                    if (skillDesc) break;
                                }
                            }
                            if (skillDesc) break;
                        }
                    }
                    
                    allSkills.push(equipEffect[i]);
                    skillSources.push({
                        type: 'equip',
                        desc: skillDesc || equip.skillDisp || ''
                    });
                }
            }
            
            // 4. 心法盘技能
            if (chef.disk && chef.disk.ambers) {
                for (var a = 0; a < chef.disk.ambers.length; a++) {
                    var amber = chef.disk.ambers[a];
                    if (amber.data && amber.data.allEffect && chef.disk.level) {
                        var levelEffect = amber.data.allEffect[chef.disk.level - 1];
                        var amberDesc = '';
                        if (typeof getAmberDisplayByLevel === 'function') {
                            amberDesc = getAmberDisplayByLevel(amber.data, chef.disk.level);
                        }
                        if (levelEffect) {
                            for (var i = 0; i < levelEffect.length; i++) {
                                allSkills.push(levelEffect[i]);
                                skillSources.push({
                                    type: 'amber',
                                    desc: amberDesc
                                });
                            }
                        }
                    }
                }
            }
            
            // 遍历所有技能，根据类型分别计算
            for (var s = 0; s < allSkills.length; s++) {
                var skill = allSkills[s];
                var source = skillSources[s];
                
                // ========== 计算贵客率 (GuestApearRate) ==========
                if (skill.type === "GuestApearRate") {
                    var value = skill.value || 0;
                    var condition = skill.condition;
                    
                    if (condition === "Self") {
                        result.guestRate += value;
                    } else if (condition === "Partial") {
                        var effectCount = 0;
                        var conditionType = skill.conditionType;
                        var conditionValueList = skill.conditionValueList || [];
                        
                        if (conditionType === "ChefTag" && conditionValueList.length > 0) {
                            for (var cc in custom) {
                                if (!custom[cc].chef || !custom[cc].chef.chefId) {
                                    continue;
                                }
                                var chefTags = custom[cc].chef.tags || [];
                                for (var t = 0; t < conditionValueList.length; t++) {
                                    if (chefTags.indexOf(conditionValueList[t]) >= 0) {
                                        effectCount++;
                                        break;
                                    }
                                }
                            }
                        } else {
                            for (var cc in custom) {
                                if (custom[cc].chef && custom[cc].chef.chefId) {
                                    effectCount++;
                                }
                            }
                        }
                        result.guestRate += value * effectCount;
                    }
                }
                
                // ========== 计算暴击率 (GuestDropCount) ==========
                // 计算厨师技能、修炼技能和厨具技能，不计算心法盘
                if (skill.type === "GuestDropCount" && (source.type === 'chef' || source.type === 'ultimate' || source.type === 'equip')) {
                    var conditionType = skill.conditionType;
                    
                    if (conditionType === "PerRank") {
                        // PerRank 类型：根据菜谱品级计算
                        var conditionValue = skill.conditionValue || 4;
                        var desc = source.desc || "";
                        var percentMatch = desc.match(/(\d+)%/);
                        var basePercent = percentMatch ? parseInt(percentMatch[1]) : 0;
                        
                        var qualifiedRecipeCount = 0;
                        for (var r = 0; r < recipes.length; r++) {
                            var recipe = recipes[r];
                            if (recipe.data && recipe.rankVal >= conditionValue) {
                                qualifiedRecipeCount++;
                            }
                        }
                        
                        qualifiedRecipeCount = Math.min(qualifiedRecipeCount, 3);
                        var critIncrease = basePercent * qualifiedRecipeCount;
                        result.critRate += critIncrease;
                    } else {
                        // 非 PerRank 类型
                        var desc = source.desc || "";
                        // 从描述中提取"稀有客人赠礼数量XX%"中的百分比
                        var percentMatch = desc.match(/稀有客人赠礼数量(\d+)%/);
                        var basePercent = percentMatch ? parseInt(percentMatch[1]) : 0;
                        var multiplier = (skill.value || 100) / 100;
                        var critIncrease = basePercent * multiplier;
                        result.critRate += critIncrease;
                    }
                }
                
                // ========== 计算时间 (OpenTime) ==========
                // 只计算厨师技能、修炼技能和厨具技能，不计算心法盘
                if (skill.type === "OpenTime" && (source.type === 'chef' || source.type === 'ultimate' || source.type === 'equip')) {
                    var timeValue = skill.value || 0;
                    // 截断到一位小数（向0方向截断）：先乘10，向0取整，再除以10
                    timeValue = Math.trunc(timeValue * 10) / 10;
                    // value 为正数就加，负数就减
                    result.timePercentage += timeValue;
                }
                
                // ========== 统计符文率技能 (GuestAntiqueDropRate) ==========
                // 只计算厨师技能和修炼技能，不计算厨具和心法盘
                if (skill.type === "GuestAntiqueDropRate" && (source.type === 'chef' || source.type === 'ultimate')) {
                    guestAntiqueDropRateSkills.push({
                        value: skill.value,
                        conditionType: skill.conditionType,
                        conditionValue: skill.conditionValue
                    });
                }
            }
        }
        
        // ========== 应用七侠加成 ==========
        if (qixiaData) {
            // 遍历所有场上厨师，检查是否有七侠加成的 tag
            for (var c in custom) {
                if (!custom[c].chef || !custom[c].chef.chefId) {
                    continue;
                }
                var chef = custom[c].chef;
                var chefTags = chef.tags || [];
                
                // 检查厨师的每个 tag 是否有对应的七侠技法加成
                for (var t = 0; t < chefTags.length; t++) {
                    var tag = chefTags[t];
                    if (qixiaData[tag]) {
                        // 添加贵客率加成
                        if (qixiaData[tag].GuestApearRate) {
                            result.guestRate += qixiaData[tag].GuestApearRate;
                        }
                    }
                }
            }
        }
        
        // ========== 计算符文率 ==========
        // 获取品级对应的默认符文率
        var baseRuneRate = RUNE_RATE_MAP[qualityLevel] || 50;
        result.runeRate = baseRuneRate;
        
        // 计算符文率加成
        if (guestAntiqueDropRateSkills.length > 0) {
            var runeRateIncrease = 0;
            
            for (var i = 0; i < guestAntiqueDropRateSkills.length; i++) {
                var skill = guestAntiqueDropRateSkills[i];
                var isValid = false;
                
                // 如果技能有 conditionType 字段，并且为 Rank
                if (skill.conditionType === 'Rank') {
                    // 根据 conditionValue 判断品级是否满足
                    var requiredRank = skill.conditionValue || 3;
                    if (parseInt(qualityLevel) >= requiredRank) {
                        isValid = true;
                    }
                } else {
                    // 如果没有 conditionType 或不是 Rank，则不需要品级判断，直接生效
                    isValid = true;
                }
                
                if (isValid) {
                    // 累加每个技能的 value / 10
                    runeRateIncrease += (skill.value / 10);
                }
            }
            
            // 在默认符文率基础上，加上所有有效技能的贡献值
            if (runeRateIncrease > 0) {
                result.runeRate += runeRateIncrease;
            }
        }
        
        // ========== 计算实际贵客率 ==========
        if (starLevel && quantity) {
            var minQuantity = MIN_QUANTITY_MAP[starLevel] || 7;
            
            // 如果份数小于对应星级的最低要求，实际贵客率直接为0
            if (quantity < minQuantity) {
                result.actualGuestRate = 0;
            } else {
                var baseRate = 0;
                
                // 根据星级选择不同的公式
                switch(starLevel) {
                    case 1:
                        baseRate = (0.05 + (quantity - 20) * 0.013) * (100 + result.guestRate);
                        break;
                    case 2:
                        baseRate = (0.08 + (quantity - 15) * 0.02) * (100 + result.guestRate);
                        break;
                    case 3:
                        baseRate = (0.083 + (quantity - 12) * 0.016) * (100 + result.guestRate);
                        break;
                    case 4:
                        baseRate = (0.1142 + (quantity - 10) * 0.0059) * (100 + result.guestRate);
                        break;
                    case 5:
                        baseRate = (0.1006 + (quantity - 7) * 0.0084) * (100 + result.guestRate);
                        break;
                    default:
                        baseRate = (0.1006 + (quantity - 7) * 0.0084) * (100 + result.guestRate);
                }
                
                // 如果实际贵客率为负数，设置为0
                result.actualGuestRate = baseRate < 0 ? 0 : baseRate;
            }
        }
        
        // ========== 计算百锅产出 ==========
        if (result.actualGuestRate !== undefined && result.runeRate !== undefined && result.critRate !== undefined) {
            // 对实际贵客率截断取整保留两位小数
            var actualGuestRateRounded = Math.floor(result.actualGuestRate * 100) / 100;
            // 符文率是整数，不需要处理
            var runeRateValue = result.runeRate;
            // 对暴击率截断取整保留两位小数
            var critRateRounded = Math.floor(result.critRate * 100) / 100;
            
            // 使用处理后的值计算百锅产出
            var hundredPotOutput = 0.01 * actualGuestRateRounded * runeRateValue * critRateRounded;
            // 对最终结果截断取整保留两位小数，然后除以100
            result.hundredPotOutput = Math.floor(hundredPotOutput * 100) / 100 / 100;
            
            // ========== 计算单位食材 ==========
            if (quantity !== undefined && quantity > 0) {
                var unitMaterialOutput = (0.1 / quantity) * actualGuestRateRounded * runeRateValue * critRateRounded;
                // 对最终结果截断取整保留两位小数，然后除以100
                result.unitMaterialOutput = Math.floor(unitMaterialOutput * 100) / 100 / 100;
            }
            
            // ========== 计算单位时间 ==========
            // 只有当单位食材存在时才计算单位时间
            if (result.unitMaterialOutput > 0) {
                // 对单位食材截断取整保留两位小数
                var unitMaterialRounded = Math.floor(result.unitMaterialOutput * 100) / 100;
                // 对时间百分比截断取整保留两位小数
                var timePercentageRounded = Math.floor(result.timePercentage * 100) / 100;
                
                if (timePercentageRounded !== 0) {
                    var unitTimeOutput = unitMaterialRounded * 100 / timePercentageRounded * 100;
                    // 对最终结果截断取整保留两位小数，然后除以100
                    result.unitTimeOutput = Math.floor(unitTimeOutput * 100) / 100 / 100;
                }
            }
        }
        
        return result;
    }
    
    /**
     * 更新计算摘要显示
     * 更新所有显示字段，包括贵客率、暴击率、时间等
     * @public
     * @param {Object} calCustomRule - 全局计算规则对象
     */
    function updateSummaryDisplay(calCustomRule) {
        // 计算并更新贵客率计算器的所有字段
        if (calCustomRule.isGuestRate && calCustomRule.rules.length > 0) {
            // 获取星级、份数和品级
            var starLevel = parseInt($("#star-level").val()) || 5;
            var quantity = parseInt($("#quantity-value").val()) || 7;
            var qualityLevel = $("#quality-level").val() || "1";
            
            var fields = calculateFields(calCustomRule.rules[0].custom, calCustomRule.rules[0], starLevel, quantity, qualityLevel);
            
            // 更新显示（所有数值都使用截断取整，不使用四舍五入）
            $("#guest-rate-value").text(fields.guestRate + "%");
            $("#total-crit-rate").text((Math.floor(fields.critRate * 100) / 100).toFixed(2) + "%");
            $("#time-percentage").text(formatNumber(Math.floor(fields.timePercentage * 100) / 100) + "%");
            $("#actual-guest-rate").text((Math.floor(fields.actualGuestRate * 100) / 100).toFixed(2) + "%");
            $("#rune-rate").text(fields.runeRate + "%");
            
            // 同步贵客率到同贵客双菜谱区域（如果该区域已展开）
            if ($(".double-recipe-section").is(":visible")) {
                $("#guest-rate-input").val(fields.guestRate);
                // 重新计算同贵客双菜谱数据
                calculateDualRecipe();
            }
            
            // 显示百锅产出（使用截断取整）
            if (fields.hundredPotOutput !== undefined) {
                $("#hundred-pot-output").text((Math.floor(fields.hundredPotOutput * 100) / 100).toFixed(2));
            }
            
            // 显示单位食材（使用截断取整）
            if (fields.unitMaterialOutput !== undefined) {
                $("#unit-material").text((Math.floor(fields.unitMaterialOutput * 100) / 100).toFixed(2));
            }
            
            // 显示单位时间（使用截断取整）
            if (fields.unitTimeOutput !== undefined) {
                $("#unit-time").text((Math.floor(fields.unitTimeOutput * 100) / 100).toFixed(2));
            }
        }
    }
    
    // ========================================
    // 厨师分类查询功能
    // ========================================
    
    /**
     * 判断是否为贵客率计算模式
     * @public
     * @returns {boolean} true 表示贵客率计算模式，false 表示其他模式
     */
    function isGuestRateMode() {
        return typeof calCustomRule !== 'undefined' && calCustomRule && calCustomRule.isGuestRate === true;
    }
    
    /**
     * 分析厨师（包含技能、修炼技能、心法盘、厨具）、厨具关技能
     * @public
     * @param {Object} chefOrEquip - 厨师或厨具对象
     * @param {Object} qixiaData - 七侠加成数据
     * @param {boolean} useEquip - 是否使用厨具
     * @param {boolean} useAmber - 是否使用遗玉
     * @param {Object} localData - 本地数据
     * @param {Object} configUltimatedIds - 配置的已修炼厨师ID
     * @param {string} type - 类型：'chef' 或 'equip'
     * @returns {Object} 包含技能分析结果的对象
     */
    function analyzeChefGuestRateSkills(chefOrEquip, qixiaData, useEquip, useAmber, localData, configUltimatedIds, type) {
        type = type || 'chef'; // 默认为厨师
        
        var result = {
            hasSkills: false,
            categories: '',
            skillValues: {
                guestRate: 0,
                crit: 0,
                time: 0,
                rune: 0,
                rarity: chefOrEquip.rarity || 0
            }
        };
        
        var targetSkillTypes = ['GuestApearRate', 'GuestDropCount', 'OpenTime', 'GuestAntiqueDropRate'];
        var categoryFlags = {
            guestRate: false,
            crit: false,
            time: false,
            rune: false
        };
        
        // 如果是厨具，只分析厨具技能
        if (type === 'equip') {
            var equip = chefOrEquip;
            
            // 检查厨具技能
            if (equip.effect) {
                for (var i = 0; i < equip.effect.length; i++) {
                    var skill = equip.effect[i];
                    if (targetSkillTypes.indexOf(skill.type) >= 0) {
                        result.hasSkills = true;
                        
                        // 设置分类标记
                        if (skill.type === 'GuestApearRate') {
                            categoryFlags.guestRate = true;
                            if (skill.value) {
                                result.skillValues.guestRate += skill.value;
                            }
                        } else if (skill.type === 'OpenTime') {
                            categoryFlags.time = true;
                            if (skill.value) {
                                result.skillValues.time += skill.value;
                            }
                        }
                    }
                }
            }
            
            // 生成分类字符串（厨具只有贵客和时间两类）
            var categories = [];
            if (categoryFlags.guestRate) categories.push('guest-rate-category');
            if (categoryFlags.time) categories.push('time-category');
            result.categories = categories.join(' ');
            
            return result;
        }
        
        // 以下是厨师的分析逻辑
        var chef = chefOrEquip;
        
        // 检查该厨师是否已修炼
        var isUltimated = false;
        if (typeof isChefUltimated === 'function') {
            isUltimated = isChefUltimated(chef.chefId, localData, configUltimatedIds);
        }
        
        // 收集所有技能来源
        var allSkillSources = [];
        
        // 1. 厨师技能
        if (chef.specialSkillEffect) {
            for (var i = 0; i < chef.specialSkillEffect.length; i++) {
                var skill = chef.specialSkillEffect[i];
                if (targetSkillTypes.indexOf(skill.type) >= 0) {
                    result.hasSkills = true;
                }
                allSkillSources.push({
                    skill: skill,
                    type: 'chef',
                    desc: chef.specialSkillDisp || ''
                });
            }
        }
        
        // 2. 修炼技能
        if (chef.ultimateSkillEffect) {
            for (var i = 0; i < chef.ultimateSkillEffect.length; i++) {
                var skill = chef.ultimateSkillEffect[i];
                if (targetSkillTypes.indexOf(skill.type) >= 0) {
                    result.hasSkills = true;
                }
                if (isUltimated) {
                    allSkillSources.push({
                        skill: skill,
                        type: 'ultimate',
                        desc: chef.ultimateSkillDisp || ''
                    });
                }
            }
        }
        
        // 3. 厨具技能
        if (useEquip && chef.equip && chef.equip.effect) {
            for (var i = 0; i < chef.equip.effect.length; i++) {
                var skill = chef.equip.effect[i];
                if (targetSkillTypes.indexOf(skill.type) >= 0) {
                    result.hasSkills = true;
                }
                allSkillSources.push({
                    skill: skill,
                    type: 'equip',
                    desc: chef.equip.desc || ''
                });
            }
        }
        
        // 4. 心法盘技能
        var diskSkills = [];
        if (useAmber && chef.disk && chef.disk.ambers) {
            for (var a = 0; a < chef.disk.ambers.length; a++) {
                var amber = chef.disk.ambers[a];
                if (amber.data && amber.data.allEffect && chef.disk.level) {
                    var levelEffect = amber.data.allEffect[chef.disk.level - 1];
                    if (levelEffect) {
                        for (var i = 0; i < levelEffect.length; i++) {
                            var skill = levelEffect[i];
                            if (targetSkillTypes.indexOf(skill.type) >= 0) {
                                result.hasSkills = true;
                            }
                            diskSkills.push(skill);
                        }
                    }
                }
            }
        }
        
        // 5. 检查七侠加成
        if (qixiaData && chef.tags) {
            for (var t = 0; t < chef.tags.length; t++) {
                var tag = chef.tags[t];
                if (qixiaData[tag] && qixiaData[tag].GuestApearRate) {
                    result.hasSkills = true;
                    categoryFlags.guestRate = true;
                    result.skillValues.guestRate += qixiaData[tag].GuestApearRate;
                }
            }
        }
        
        if (!result.hasSkills) {
            return result;
        }
        
        // 设置分类标记
        if (chef.specialSkillEffect) {
            for (var i = 0; i < chef.specialSkillEffect.length; i++) {
                var skill = chef.specialSkillEffect[i];
                if (skill.type === 'GuestApearRate') categoryFlags.guestRate = true;
                else if (skill.type === 'GuestDropCount') categoryFlags.crit = true;
                else if (skill.type === 'OpenTime') categoryFlags.time = true;
                else if (skill.type === 'GuestAntiqueDropRate') categoryFlags.rune = true;
            }
        }
        
        if (chef.ultimateSkillEffect) {
            for (var i = 0; i < chef.ultimateSkillEffect.length; i++) {
                var skill = chef.ultimateSkillEffect[i];
                if (skill.type === 'GuestApearRate') categoryFlags.guestRate = true;
                else if (skill.type === 'GuestDropCount') categoryFlags.crit = true;
                else if (skill.type === 'OpenTime' || skill.type === 'CookbookTime') categoryFlags.time = true;
                else if (skill.type === 'GuestAntiqueDropRate') categoryFlags.rune = true;
            }
        }
        
        if (useEquip && chef.equip && chef.equip.effect) {
            for (var i = 0; i < chef.equip.effect.length; i++) {
                var skill = chef.equip.effect[i];
                if (skill.type === 'GuestApearRate') categoryFlags.guestRate = true;
                else if (skill.type === 'GuestDropCount') categoryFlags.crit = true;
                else if (skill.type === 'OpenTime') categoryFlags.time = true;
                else if (skill.type === 'GuestAntiqueDropRate') categoryFlags.rune = true;
            }
        }
        
        if (useAmber && diskSkills.length > 0) {
            for (var i = 0; i < diskSkills.length; i++) {
                var skill = diskSkills[i];
                if (skill.type === 'GuestApearRate') categoryFlags.guestRate = true;
            }
        }
        
        // 计算技能值
        for (var i = 0; i < allSkillSources.length; i++) {
            var source = allSkillSources[i];
            var skill = source.skill;
            
            if (skill.type === 'GuestApearRate') {
                if (skill.value) {
                    result.skillValues.guestRate += skill.value;
                }
            } else if (skill.type === 'GuestDropCount') {
                var desc = source.desc || '';
                if (skill.conditionType === 'PerRank') {
                    var percentMatch = desc.match(/(\d+)%/);
                    if (percentMatch) {
                        var basePercent = parseInt(percentMatch[1]);
                        result.skillValues.crit += basePercent * 3;
                    }
                } else {
                    var percentMatch = desc.match(/稀有客人赠礼数量(\d+)%/);
                    if (percentMatch) {
                        var basePercent = parseInt(percentMatch[1]);
                        var multiplier = (skill.value || 100) / 100;
                        result.skillValues.crit += basePercent * multiplier;
                    }
                }
            } else if (skill.type === 'GuestAntiqueDropRate') {
                if (source.type === 'chef' || source.type === 'ultimate') {
                    if (skill.value) {
                        result.skillValues.rune += skill.value;
                    }
                }
            }
        }
        
        // 心法盘技能
        for (var i = 0; i < diskSkills.length; i++) {
            var skill = diskSkills[i];
            if (skill.type === 'GuestApearRate') {
                if (skill.value) {
                    result.skillValues.guestRate += skill.value;
                }
            }
        }
        
        // 计算时间技能值
        if (categoryFlags.time) {
            var totalTimeAddition = 0;
            
            if (chef.specialSkillEffect && typeof getTimeAddition === 'function') {
                totalTimeAddition += getTimeAddition(chef.specialSkillEffect);
            }
            
            if (isUltimated && chef.ultimateSkillEffect && typeof getTimeAddition === 'function') {
                totalTimeAddition += getTimeAddition(chef.ultimateSkillEffect);
            }
            
            if (useEquip && chef.equip && chef.equip.effect && typeof getTimeAddition === 'function') {
                var equipEffect = chef.equip.effect;
                if (typeof updateEquipmentEffect === 'function') {
                    equipEffect = updateEquipmentEffect(chef.equip.effect, chef.selfUltimateEffect || []);
                }
                totalTimeAddition += getTimeAddition(equipEffect);
            }
            
            result.skillValues.time = totalTimeAddition;
        }
        
        // 生成分类字符串
        var categories = [];
        if (categoryFlags.guestRate) categories.push('guest-rate-category');
        if (categoryFlags.crit) categories.push('crit-category');
        if (categoryFlags.time) categories.push('time-category');
        if (categoryFlags.rune) categories.push('rune-category');
        result.categories = categories.join(' ');
        
        return result;
    }
    
    // 全局变量：保存当前选中的分类，所有选择框共享
    var globalChefCategory = null;
    
    // 全局变量：保存符文分组的展开/收起状态
    var runeGroupExpandState = {};
    
    /**
     * 初始化厨师或厨具选择框的分类标签
     * @public
     * @param {string} selectorType - 选择器类型：'chef'、'equip' 或 'recipe'
     */
    function initChefCategoryTabs(selectorType) {
        selectorType = selectorType || 'chef'; // 默认为厨师
        
        var selector = '';
        if (selectorType === 'chef') {
            selector = "select.select-picker-chef";
        } else if (selectorType === 'equip') {
            selector = "select.select-picker-equip";
        } else if (selectorType === 'recipe') {
            selector = "select.select-picker-recipe";
        }
        
        $(selector).on("shown.bs.select", function() {
            if (!isGuestRateMode()) {
                $(this).parent().find('.dropdown-menu .chef-category-tabs, .dropdown-menu .equip-category-tabs, .dropdown-menu .recipe-category-tabs').remove();
                return;
            }
            
            var $select = $(this);
            var selectId = $select.attr('id') || (selectorType + '-select-' + Math.random());
            $select.attr('id', selectId);
            
            var sp = $select.data('selectpicker');
            var $dropdown = sp && sp.$menu ? sp.$menu : $select.parent().find('.dropdown-menu');
            
            // 每次打开时都保存当前的 option HTML（获取最新数据）
            var currentOptionsHtml = $select.html();
            
            // 记录初始顺序
            $select.find('option').each(function(idx) {
                var $opt = $(this);
                if ($opt.attr('data-orig-order') === undefined) {
                    $opt.attr('data-orig-order', String(idx));
                }
            });
            
            // 根据类型创建不同的分类标签
            var tabsClass = selectorType + '-category-tabs';
            var tabsHtml = '';
            
            if (selectorType === 'chef') {
                // 厨师：全部、贵客、暴击、时间、符文
                tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '">' +
                    '<li class="active"><a href="#" class="tab-all">全部</a></li>' +
                    '<li><a href="#" class="tab-guest" data-category="guest-rate-category">贵客</a></li>' +
                    '<li><a href="#" class="tab-crit" data-category="crit-category">暴击</a></li>' +
                    '<li><a href="#" class="tab-time" data-category="time-category">时间</a></li>' +
                    '<li><a href="#" class="tab-rune" data-category="rune-category">符文</a></li>' +
                    '</ul>';
            } else if (selectorType === 'equip') {
                // 厨具：全部、贵客、时间
                tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '">' +
                    '<li class="active"><a href="#" class="tab-all">全部</a></li>' +
                    '<li><a href="#" class="tab-guest" data-category="guest-rate-category">贵客</a></li>' +
                    '<li><a href="#" class="tab-time" data-category="time-category">时间</a></li>' +
                    '</ul>';
            } else if (selectorType === 'recipe') {
                // 菜谱：全部、金符文、银符文、铜符文
                tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '">' +
                    '<li class="active"><a href="#" class="tab-all">全部</a></li>' +
                    '<li><a href="#" class="tab-gold" data-category="gold-rune-category">金符文</a></li>' +
                    '<li><a href="#" class="tab-silver" data-category="silver-rune-category">银符文</a></li>' +
                    '<li><a href="#" class="tab-bronze" data-category="bronze-rune-category">铜符文</a></li>' +
                    '</ul>';
            }
            
            // 创建分类标签（如果不存在）
            if (!$dropdown.find('.' + tabsClass).length) {
                var $searchBox = $dropdown.find('.bs-searchbox');
                if ($searchBox.length) {
                    $searchBox.after(tabsHtml);
                } else {
                    $dropdown.prepend(tabsHtml);
                }
            }
            
            // 绑定标签点击事件
            $dropdown.find('.tab-all, .tab-guest, .tab-crit, .tab-time, .tab-rune, .tab-gold, .tab-silver, .tab-bronze').off('click').on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                var $tab = $(this);
                var categoryName = $tab.attr('data-category');
                var sortKey = null;
                
                // 根据标签确定排序键
                if ($tab.hasClass('tab-all')) {
                    sortKey = null;  // 全部标签：不排序
                } else if ($tab.hasClass('tab-guest')) {
                    sortKey = 'guestRate';  // 贵客标签：按 GuestApearRate 排序
                } else if ($tab.hasClass('tab-crit')) {
                    sortKey = 'crit';  // 暴击标签：按 GuestDropCount 排序
                } else if ($tab.hasClass('tab-time')) {
                    sortKey = 'time';  // 时间标签：按 OpenTime 排序
                } else if ($tab.hasClass('tab-rune')) {
                    sortKey = 'rune';  // 符文标签：按 GuestAntiqueDropRate 排序
                } else if ($tab.hasClass('tab-gold') || $tab.hasClass('tab-silver') || $tab.hasClass('tab-bronze')) {
                    sortKey = 'recipeTime';  // 符文分类：按时间排序
                }
                
                // 更新标签状态
                $tab.parent().addClass('active').siblings().removeClass('active');
                
                // 菜谱使用特殊的过滤函数
                if (selectorType === 'recipe') {
                    filterAndSortRecipes($select, currentOptionsHtml, categoryName === 'all' ? null : categoryName, sortKey);
                } else {
                    // 厨师和厨具使用通用的过滤函数
                    filterAndSortChefs($select, currentOptionsHtml, categoryName === 'all' ? null : categoryName, sortKey);
                }
                
                return false;
            });
            
            // 立即应用保存的分类，避免闪动
            var categoryToApply = globalChefCategory;
            
            if (categoryToApply) {
                // 恢复标签选中状态
                $dropdown.find('.' + tabsClass + ' li').removeClass('active');
                
                if (categoryToApply.category === null) {
                    $dropdown.find('.tab-all').parent().addClass('active');
                } else {
                    var $targetTab = $dropdown.find('.' + tabsClass + ' a[data-category="' + categoryToApply.category + '"]');
                    if ($targetTab.length) {
                        $targetTab.parent().addClass('active');
                    } else {
                        $dropdown.find('.tab-all').parent().addClass('active');
                        categoryToApply = {category: null, sortKey: null};
                    }
                }
                
                if (selectorType === 'recipe') {
                    filterAndSortRecipes($select, currentOptionsHtml, categoryToApply.category, categoryToApply.sortKey);
                } else {
                    filterAndSortChefs($select, currentOptionsHtml, categoryToApply.category, categoryToApply.sortKey);
                }
            } else {
                $dropdown.find('.tab-all').parent().addClass('active');
                if (selectorType === 'recipe') {
                    filterAndSortRecipes($select, currentOptionsHtml, null, null);
                } else {
                    filterAndSortChefs($select, currentOptionsHtml, null, null);
                }
            }
        });
    }
    
    /**
     * 过滤和排序菜谱列表（菜谱专用）
     * @private
     * @param {jQuery} $select - 选择框对象
     * @param {string} originalHtml - 原始的 option HTML
     * @param {string} categoryName - 分类名称
     * @param {string} sortKey - 排序键
     */
    function filterAndSortRecipes($select, originalHtml, categoryName, sortKey) {
        // 保存当前选中的分类到全局变量（所有选择框共享）
        globalChefCategory = {category: categoryName, sortKey: sortKey};
        
        var sp = $select.data('selectpicker');
        if (!sp) return;
        
        // 保存当前选中的值
        var currentValue = $select.val();
        
        // 保存当前的搜索关键词
        var $searchInput = sp.$menu.find('.bs-searchbox input');
        var searchKeyword = $searchInput.length ? $searchInput.val() : '';
        
        // 1) 恢复原始的 option 列表
        $select.html(originalHtml);
        
        // 2) 过滤：移除不符合分类的 option
        if (categoryName) {
            $select.find('option').each(function() {
                var $opt = $(this);
                var cat = $opt.attr('data-category') || '';
                
                // 保留占位项
                if ($opt.val() === "" || $opt.val() === null || $opt.text().trim() === "") {
                    return;
                }
                
                // 检查是否匹配分类
                var shouldShow = cat && cat.indexOf(categoryName) >= 0;
                if (!shouldShow) {
                    $opt.remove();
                }
            });
        }
        
        // 3) 排序和分组
        if (sortKey === 'recipeTime') {
            // 菜谱按符文分组 + 时间升序排序
            var runeList = [];
            if (categoryName === 'gold-rune-category') {
                runeList = GOLD_RUNES;
            } else if (categoryName === 'silver-rune-category') {
                runeList = SILVER_RUNES;
            } else if (categoryName === 'bronze-rune-category') {
                runeList = BRONZE_RUNES;
            }
            
            var $options = $select.find('option');
            var placeholders = [];
            var recipesByRune = {}; // 按符文分组的菜谱
            
            $options.each(function() {
                var $opt = $(this);
                var isPlaceholder = ($opt.val() === "" || $opt.val() === null || $opt.text().trim() === "");
                
                if (isPlaceholder) {
                    placeholders.push($opt);
                } else {
                    var runeName = $opt.attr('data-rune-name') || '';
                    if (!recipesByRune[runeName]) {
                        recipesByRune[runeName] = [];
                    }
                    recipesByRune[runeName].push($opt);
                }
            });
            
            // 清空选择框
            $select.empty();
            
            // 添加占位项
            for (var i = 0; i < placeholders.length; i++) {
                $select.append(placeholders[i]);
            }
            
            // 按符文顺序添加分组
            for (var r = 0; r < runeList.length; r++) {
                var runeName = runeList[r];
                var recipes = recipesByRune[runeName];
                
                if (recipes && recipes.length > 0) {
                    // 按时间排序该符文下的菜谱
                    recipes.sort(function(a, b) {
                        var aTime = Number($(a).attr('data-time') || 999999);
                        var bTime = Number($(b).attr('data-time') || 999999);
                        if (aTime !== bTime) return aTime - bTime;
                        return Number($(a).attr('data-orig-order') || 0) - Number($(b).attr('data-orig-order') || 0);
                    });
                    
                    // 创建 optgroup，标签包含菜谱数量
                    var labelWithCount = runeName + ' (' + recipes.length + ')';
                    var $optgroup = $('<optgroup label="' + labelWithCount + '"></optgroup>');
                    for (var j = 0; j < recipes.length; j++) {
                        $optgroup.append(recipes[j]);
                    }
                    $select.append($optgroup);
                }
            }
            
            // 添加不在列表中的符文（如果有）
            for (var runeName in recipesByRune) {
                if (runeList.indexOf(runeName) === -1) {
                    var recipes = recipesByRune[runeName];
                    recipes.sort(function(a, b) {
                        var aTime = Number($(a).attr('data-time') || 999999);
                        var bTime = Number($(b).attr('data-time') || 999999);
                        if (aTime !== bTime) return aTime - bTime;
                        return Number($(a).attr('data-orig-order') || 0) - Number($(b).attr('data-orig-order') || 0);
                    });
                    
                    // 创建 optgroup，标签包含菜谱数量
                    var labelWithCount = runeName + ' (' + recipes.length + ')';
                    var $optgroup = $('<optgroup label="' + labelWithCount + '"></optgroup>');
                    for (var j = 0; j < recipes.length; j++) {
                        $optgroup.append(recipes[j]);
                    }
                    $select.append($optgroup);
                }
            }
        } else if (!categoryName) {
            // 不排序且显示全部：恢复原始顺序
            var opts = $select.find('option').toArray();
            opts.sort(function(a, b) {
                return Number($(a).attr('data-orig-order') || 0) - Number($(b).attr('data-orig-order') || 0);
            });
            $select.empty().append(opts);
        }
        
        // 4) 恢复选中的值
        $select.val(currentValue);
        
        // 5) 刷新 selectpicker
        sp.refresh();
        
        // 6) 冲突检测和标红贵客（贵客率模式下）
        if (sortKey === 'recipeTime' && typeof GuestRateCalculator !== 'undefined' && GuestRateCalculator.isGuestRateMode()) {
            detectAndMarkConflicts($select, sp, runeList);
        }
        
        // 7) 添加 optgroup 折叠功能
        if (sortKey === 'recipeTime') {
            addOptgroupCollapseFeature(sp.$menu);
            
            // 监听搜索框输入事件，自动展开包含搜索结果的符文分组
            var $searchInput = sp.$menu.find('.bs-searchbox input');
            if ($searchInput.length) {
                $searchInput.off('input.runeExpand').on('input.runeExpand', function() {
                    var searchText = $(this).val().toLowerCase();
                    
                    if (searchText) {
                        // 有搜索内容时，展开所有包含可见菜谱的符文分组
                        sp.$menu.find('.dropdown-header').each(function() {
                            var $header = $(this);
                            var $options = $header.nextUntil('.dropdown-header', 'li');
                            
                            // 检查该分组下是否有可见的菜谱
                            var hasVisibleOptions = false;
                            $options.each(function() {
                                if ($(this).is(':visible') && !$(this).hasClass('hidden')) {
                                    hasVisibleOptions = true;
                                    return false; // 跳出循环
                                }
                            });
                            
                            // 如果有可见菜谱，展开该分组
                            if (hasVisibleOptions) {
                                var isCollapsed = $header.data('collapsed');
                                if (isCollapsed) {
                                    var $icon = $header.find('.collapse-icon');
                                    $options.show();
                                    $icon.css('transform', 'translateY(-50%) rotate(0deg)');
                                    $header.data('collapsed', false);
                                    
                                    // 更新全局状态
                                    var runeName = $header.data('rune-name');
                                    if (runeName) {
                                        runeGroupExpandState[runeName] = false;
                                    }
                                }
                            }
                        });
                    }
                });
            }
        }
        
        // 7) 重新应用搜索关键词（如果有）
        if (searchKeyword) {
            // 延迟执行，确保 refresh 完成后再应用搜索
            setTimeout(function() {
                var $newSearchInput = sp.$menu.find('.bs-searchbox input');
                if ($newSearchInput.length) {
                    $newSearchInput.val(searchKeyword);
                    // 触发搜索
                    $newSearchInput.trigger('input');
                }
            }, 0);
        }
    }
    
    /**
     * 为 optgroup 添加折叠功能
     * @private
     * @param {jQuery} $dropdown - 下拉菜单对象
     */
    function addOptgroupCollapseFeature($dropdown) {
        // 为每个 optgroup 标签添加折叠功能
        $dropdown.find(".dropdown-header").each(function() {
            var $header = $(this);
            
            // 如果还没有添加折叠图标，则添加
            if (!$header.find(".collapse-icon").length) {
                // 添加可折叠类
                $header.addClass("collapsible");
                
                // 直接设置字体大小为15px
                $header.css('font-size', '15px');
                
                // 使用 Bootstrap 的 caret 样式
                var $icon = $("<span class='collapse-icon caret'></span>");
                $header.append($icon);
                
                // 获取符文名称（去掉数量部分）
                var headerText = $header.text().trim();
                var runeName = headerText.replace(/\s*\(\d+\)\s*$/, ''); // 移除 "(数量)" 部分
                
                // 检查是否有保存的展开状态
                var isCollapsed = true;
                if (runeGroupExpandState.hasOwnProperty(runeName)) {
                    isCollapsed = runeGroupExpandState[runeName];
                } else {
                    // 默认收起状态
                    runeGroupExpandState[runeName] = true;
                }
                
                // 设置初始状态
                $header.data("collapsed", isCollapsed);
                $header.data("rune-name", runeName);
                
                if (isCollapsed) {
                    // 收起状态
                    $icon.css("transform", "translateY(-50%) rotate(-90deg)");
                    $header.nextUntil(".dropdown-header", "li").hide();
                } else {
                    // 展开状态
                    $icon.css("transform", "translateY(-50%) rotate(0deg)");
                    $header.nextUntil(".dropdown-header", "li").show();
                }
            }
            
            // 点击标题切换折叠状态
            $header.off("click").on("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                var $this = $(this);
                var isCollapsed = $this.data("collapsed");
                var runeName = $this.data("rune-name");
                var $icon = $this.find(".collapse-icon");
                
                // 找到该 optgroup 下的所有选项
                var $options = $this.nextUntil(".dropdown-header", "li");
                
                if (isCollapsed) {
                    // 展开
                    $options.slideDown(200);
                    $icon.css("transform", "translateY(-50%) rotate(0deg)");
                    $this.data("collapsed", false);
                    // 保存展开状态
                    runeGroupExpandState[runeName] = false;
                } else {
                    // 收起
                    $options.slideUp(200);
                    $icon.css("transform", "translateY(-50%) rotate(-90deg)");
                    $this.data("collapsed", true);
                    // 保存收起状态
                    runeGroupExpandState[runeName] = true;
                }
            });
        });
    }
    
    /**
     * 检测并标记菜谱选择框中的贵客冲突
     * @private
     * @param {jQuery} $select - 选择框对象
     * @param {Object} sp - selectpicker 实例
     * @param {Array} runeList - 符文列表
     */
    /**
     * 检测并标记选择框中的贵客冲突
     * @private
     * @param {jQuery} $select - 选择框对象
     * @param {Object} sp - selectpicker 对象
     * @param {Array} runeList - 符文列表
     * @param {Object} gameData - 游戏数据对象（可选，如果不传则从 calCustomRule.gameData 获取）
     */
    function detectAndMarkConflicts($select, sp, runeList, gameData) {
        
        // 获取游戏数据：优先使用传入的参数，否则从 calCustomRule.gameData 获取
        if (!gameData) {
            gameData = typeof calCustomRule !== 'undefined' && calCustomRule.gameData ? calCustomRule.gameData : null;
        }
        if (!gameData || !gameData.guests) {
            return;
        }
        var $dropdown = sp.$menu;
        var $innerMenu = sp.$menuInner || $dropdown.find('ul.inner');
        
        // 获取当前选择框已选择的菜谱
        var currentSelectedRecipe = null;
        var currentValue = $select.val();
        if (currentValue) {
            // 从 option 中获取菜谱名称
            var $currentOption = $select.find('option[value="' + currentValue + '"]');
            if ($currentOption.length > 0) {
                var currentOptionText = $currentOption.text().trim();
                currentSelectedRecipe = currentOptionText.replace(/\s*\([^)]+\)\s*/g, '').trim();
            }
        }
        
        // 收集场上已选择的菜谱（用于判断冲突）
        // 注意：排除当前选择框自己已选择的菜谱
        var selectedRecipesOnField = [];
        if (calCustomRule && calCustomRule.rules && calCustomRule.rules.length > 0) {
            for (var ruleIdx = 0; ruleIdx < calCustomRule.rules.length; ruleIdx++) {
                var rule = calCustomRule.rules[ruleIdx];
                if (rule && rule.custom) {
                    for (var c in rule.custom) {
                        for (var r in rule.custom[c].recipes) {
                            if (rule.custom[c].recipes[r].data) {
                                var recipeName = rule.custom[c].recipes[r].data.name;
                                // 排除当前选择框自己已选择的菜谱
                                if (recipeName !== currentSelectedRecipe) {
                                    selectedRecipesOnField.push({
                                        recipeName: recipeName,
                                        recipeId: rule.custom[c].recipes[r].data.recipeId
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // 收集所有菜谱的贵客信息
        var guestToRecipesMap = {};  // 贵客 -> 菜谱列表的映射（全局）
        var guestToRunesMap = {};    // 贵客 -> 符文列表的映射
        var sameRuneConflictGuests = {};  // 同一符文内冲突的贵客：{符文名: [贵客列表]}
        var crossRuneConflictGuests = [];  // 跨符文冲突的贵客
        
        // 遍历每个符文分组
        runeList.forEach(function(runeName) {
            var guestToRecipesInRune = {};  // 当前符文内的贵客 -> 菜谱映射
            
            // 遍历该符文下的所有菜谱
            $select.find('option[data-rune-name="' + runeName + '"]').each(function() {
                var $opt = $(this);
                var optionText = $opt.text().trim();
                
                // 从 option text 中提取菜谱名（移除括号中的贵客信息）
                var recipeName = optionText.replace(/\s*\([^)]+\)\s*/g, '').trim();
                
                // 从贵客数据中查找该菜谱对应的贵客
                gameData.guests.forEach(function(guest) {
                    if (guest.gifts) {
                        guest.gifts.forEach(function(gift) {
                            if (gift.recipe === recipeName && gift.antique === runeName) {
                                var guestName = guest.name;
                                // 全局映射
                                if (!guestToRecipesMap[guestName]) {
                                    guestToRecipesMap[guestName] = [];
                                }
                                if (guestToRecipesMap[guestName].indexOf(recipeName) === -1) {
                                    guestToRecipesMap[guestName].push(recipeName);
                                }
                                // 符文映射
                                if (!guestToRunesMap[guestName]) {
                                    guestToRunesMap[guestName] = [];
                                }
                                if (guestToRunesMap[guestName].indexOf(runeName) === -1) {
                                    guestToRunesMap[guestName].push(runeName);
                                }
                                // 当前符文内映射
                                if (!guestToRecipesInRune[guestName]) {
                                    guestToRecipesInRune[guestName] = [];
                                }
                                if (guestToRecipesInRune[guestName].indexOf(recipeName) === -1) {
                                    guestToRecipesInRune[guestName].push(recipeName);
                                }
                            }
                        });
                    }
                });
            });
            
            // 检测当前符文内的冲突
            Object.keys(guestToRecipesInRune).forEach(function(guestName) {
                if (guestToRecipesInRune[guestName].length > 1) {
                    if (!sameRuneConflictGuests[runeName]) {
                        sameRuneConflictGuests[runeName] = [];
                    }
                    sameRuneConflictGuests[runeName].push(guestName);
                }
            });
        });
        
        // 检测跨符文冲突
        Object.keys(guestToRunesMap).forEach(function(guestName) {
            if (guestToRunesMap[guestName].length > 1) {
                crossRuneConflictGuests.push(guestName);
            }
        });
        
        // 找出与场上菜谱有冲突的贵客
        var fieldConflictGuests = [];
        selectedRecipesOnField.forEach(function(selectedRecipe) {
            gameData.guests.forEach(function(guest) {
                if (guest.gifts) {
                    guest.gifts.forEach(function(gift) {
                        if (gift.recipe === selectedRecipe.recipeName) {
                            if (fieldConflictGuests.indexOf(guest.name) === -1) {
                                fieldConflictGuests.push(guest.name);
                            }
                        }
                    });
                }
            });
        });
        
        // 标记冲突贵客（在下拉菜单的 li 元素中）
        $innerMenu.find('li').each(function() {
            var $li = $(this);
            if ($li.hasClass('divider') || $li.hasClass('disabled') || $li.hasClass('hidden')) return;
            
            var $link = $li.find('a');
            var $text = $link.find('.text');
            
            if ($text.length === 0) return;
            
            // 从 text 内容中提取贵客名称（在括号中）
            var fullText = $text.html();
            var regex = /\(([^)]+)\)/;
            var match = fullText.match(regex);
            
            if (!match) return;
            
            var guestsInParentheses = match[1];  // 括号中的贵客名称
            var guestArray = guestsInParentheses.split('、');
            
            // 从 <span class='name'> 中提取菜谱名
            var $nameSpan = $text.find('.name');
            var recipeName = '';
            if ($nameSpan.length > 0) {
                recipeName = $nameSpan.text().trim();
            } else {
                // 降级方案：如果找不到 .name，从文本中提取
                var liText = $text.text().trim();
                recipeName = liText.replace(/\s*\([^)]+\)\s*/g, '').trim();
                // 移除可能的技法信息（如"炒98炒40"）
                var skillMatch = recipeName.match(/^([^\d]+)/);
                if (skillMatch) {
                    recipeName = skillMatch[1].trim();
                }
            }
            
            // 查找对应的 option 来获取符文名称
            var runeName = '';
            $select.find('option').each(function() {
                var $opt = $(this);
                
                // 跳过没有符文名称的 option
                if (!$opt.attr('data-rune-name')) {
                    return true;  // continue
                }
                
                // 方法1: 从 data-content 属性中提取菜谱名
                var optRecipeName = '';
                var dataContent = $opt.attr('data-content');
                if (dataContent) {
                    var $tempDiv = $('<div>').html(dataContent);
                    var $optNameSpan = $tempDiv.find('.name');
                    if ($optNameSpan.length > 0) {
                        optRecipeName = $optNameSpan.text().trim();
                    }
                }
                
                // 方法2: 如果方法1失败，从 option 的 display 属性获取
                if (!optRecipeName) {
                    var optData = $opt.data();
                    if (optData && optData.display) {
                        optRecipeName = optData.display;
                    }
                }
                
                // 方法3: 如果前两个方法都失败，从 text 中提取
                if (!optRecipeName) {
                    var optText = $opt.text().trim();
                    optRecipeName = optText.replace(/\s*\([^)]+\)\s*/g, '').trim();
                    // 移除可能的技法信息
                    var skillMatch = optRecipeName.match(/^([^\d]+)/);
                    if (skillMatch) {
                        optRecipeName = skillMatch[1].trim();
                    }
                }
                
                if (optRecipeName === recipeName) {
                    runeName = $opt.attr('data-rune-name');
                    return false;  // 找到就退出循环
                }
            });
            
            if (!runeName) {
                return;
            }
            
            // 为每个贵客应用颜色标记
            var guestHtml = guestArray.map(function(guestName) {
                guestName = guestName.trim();
                
                var isFieldConflict = fieldConflictGuests.indexOf(guestName) !== -1;
                var isSameRuneConflict = sameRuneConflictGuests[runeName] && 
                                        sameRuneConflictGuests[runeName].indexOf(guestName) !== -1;
                var isCrossRuneConflict = crossRuneConflictGuests.indexOf(guestName) !== -1;
                // 检查是否与场上菜谱冲突（优先级最高，红色加粗）
                if (isFieldConflict) {
                    return '<span style="color: red; font-weight: bold;">' + guestName + '</span>';
                }
                // 检查是否在同一符文内有冲突（红色）
                if (isSameRuneConflict) {
                    return '<span style="color: red;">' + guestName + '</span>';
                }
                // 检查是否跨符文冲突（橙色）
                if (isCrossRuneConflict) {
                    return '<span style="color: #FF8C00;">' + guestName + '</span>';
                }
                // 无冲突
                return guestName;
            }).join('、');
            
            // 更新显示：只修改括号中的贵客名称颜色
            var newText = fullText.replace(regex, '(' + guestHtml + ')');
            $text.html(newText);
        });
    }
    
    /**
     * 检测场上已选择菜谱的贵客冲突
     * @private
     * @param {number} ruleIndex - 规则索引
     * @param {Object} gameData - 游戏数据对象（包含 guests 等信息）
     * @returns {Array} 冲突信息数组，每个元素包含 {guestName, recipes}
     */
    function checkGuestConflictsForSelectedRecipes(ruleIndex, gameData) {
        if (!isGuestRateMode()) {
            return [];
        }
        if (!gameData || !gameData.guests) {
            return [];
        }
        if (typeof calCustomRule === 'undefined' || !calCustomRule.rules || !calCustomRule.rules[ruleIndex]) {
            return [];
        }
        var rule = calCustomRule.rules[ruleIndex];
        if (!rule.custom) {
            return [];
        }
        var custom = rule.custom;
        
        // 收集所有已上场的菜谱
        var selectedRecipes = [];
        for (var c in custom) {
            for (var r in custom[c].recipes) {
                if (custom[c].recipes[r].data) {
                    selectedRecipes.push({
                        recipeName: custom[c].recipes[r].data.name,
                        recipeId: custom[c].recipes[r].data.recipeId,
                        itemIndex: c,
                        recipeIndex: r
                    });
                }
            }
        }
        
        
        // 按贵客分组
        var recipesByGuest = {};
        
        selectedRecipes.forEach(function(recipeInfo) {
            // 从贵客数据中查找该菜谱对应的贵客
            gameData.guests.forEach(function(guest) {
                if (guest.gifts) {
                    guest.gifts.forEach(function(gift) {
                        if (gift.recipe === recipeInfo.recipeName) {
                            if (!recipesByGuest[guest.name]) {
                                recipesByGuest[guest.name] = [];
                            }
                            // 避免重复添加
                            var alreadyAdded = recipesByGuest[guest.name].some(function(item) {
                                return item.recipeName === recipeInfo.recipeName;
                            });
                            if (!alreadyAdded) {
                                recipesByGuest[guest.name].push(recipeInfo);
                            }
                        }
                    });
                }
            });
        });
        
        // 检测冲突：如果一个贵客对应多个菜谱，则有冲突
        var conflictRecipes = [];
        var conflictInfo = [];
        
        Object.keys(recipesByGuest).forEach(function(guestName) {
            var guestRecipes = recipesByGuest[guestName];
            
            if (guestRecipes.length > 1) {
                // 添加到冲突信息数组
                conflictInfo.push({
                    guestName: guestName,
                    recipes: guestRecipes.map(function(r) { return r.recipeName; })
                });
                // 多个菜谱有冲突，全部标记为冲突
                guestRecipes.forEach(function(recipeInfo) {
                    conflictRecipes.push(recipeInfo);
                });
            }
        });
        
        // 先清除所有菜谱的冲突标记
        $(".cal-custom-item:eq(" + ruleIndex + ") .selected-item .recipe-box .recipe-box-1 .name").css({
            "color": "",
            "font-weight": ""
        });
        
        // 标记有冲突的菜谱名字为红色
        conflictRecipes.forEach(function(recipeInfo) {
            var selector = ".cal-custom-item:eq(" + ruleIndex + ") .selected-item:eq(" + recipeInfo.itemIndex + ") .recipe-box:eq(" + recipeInfo.recipeIndex + ") .recipe-box-1 .name";
            var $recipeName = $(selector);
            if ($recipeName.length > 0) {
                $recipeName.css({
                    "color": "red",
                    "font-weight": "bold"
                });
            }
        });
        
        return conflictInfo;
    }
    
    /**
     * 刷新菜谱选择框的冲突检测
     * @public
     * @param {jQuery} $select - 选择框对象
     */
    function refreshConflictDetection($select) {
        if (!$select || !$select.length) {
            return;
        }
        
        var sp = $select.data('selectpicker');
        if (!sp || !sp.$menu) {
            return;
        }
        
        // 调用冲突检测函数
        detectAndMarkConflicts($select, sp, ALL_RUNES);
    }
    
    /**
     * 为菜谱选项添加符文和贵客信息
     * @public
     * @param {Object} optionData - 选项数据对象（包含 content, runeName, guestNames 等字段）
     * @param {Object} recipeData - 菜谱数据对象
     * @param {Object} gameData - 游戏数据对象（包含 guests 等信息）
     * @returns {Array} 处理后的选项数组
     */
    function addRuneAndGuestInfoToRecipeOption(optionData, recipeData, gameData) {
        if (!isGuestRateMode() || !gameData || !gameData.guests) {
            return [optionData];
        }
        
        // 收集该菜谱对应的符文和贵客
        var runeName = null;
        var guestNames = [];
        
        for (var guestIdx = 0; guestIdx < gameData.guests.length; guestIdx++) {
            var guest = gameData.guests[guestIdx];
            if (guest.gifts) {
                for (var giftIdx = 0; giftIdx < guest.gifts.length; giftIdx++) {
                    var gift = guest.gifts[giftIdx];
                    if (gift.recipe === recipeData.name && gift.antique) {
                        // 记录符文名称（所有贵客都是同一种符文）
                        if (!runeName) {
                            runeName = gift.antique;
                        }
                        // 收集贵客名称
                        if (guestNames.indexOf(guest.name) === -1) {
                            guestNames.push(guest.name);
                        }
                    }
                }
            }
        }
        
        // 如果没有找到符文，直接返回原选项
        if (!runeName) {
            return [optionData];
        }
        
        // 保存符文和贵客信息
        optionData.runeName = runeName;
        optionData.guestNames = guestNames.join('、');
        optionData.time = recipeData.totalTime || 0;
        
        // 根据符文类型设置分类
        if (GOLD_RUNES.indexOf(runeName) >= 0) {
            optionData.category = 'gold-rune-category';
        } else if (SILVER_RUNES.indexOf(runeName) >= 0) {
            optionData.category = 'silver-rune-category';
        } else if (BRONZE_RUNES.indexOf(runeName) >= 0) {
            optionData.category = 'bronze-rune-category';
        }
        
        return [optionData];
    }
    
    /**
     * 过滤和排序厨师列表
     * @private
     * @param {jQuery} $select - 选择框对象
     * @param {string} originalHtml - 原始的 option HTML
     * @param {string} categoryName - 分类名称
     * @param {string} sortKey - 排序键
     */
    function filterAndSortChefs($select, originalHtml, categoryName, sortKey) {
        // 保存当前选中的分类到全局变量（所有选择框共享）
        globalChefCategory = {category: categoryName, sortKey: sortKey};
        
        var sp = $select.data('selectpicker');
        if (!sp) return;
        
        // 保存当前选中的值
        var currentValue = $select.val();
        
        // 保存当前的搜索关键词
        var $searchInput = sp.$menu.find('.bs-searchbox input');
        var searchKeyword = $searchInput.length ? $searchInput.val() : '';
        
        // 1) 恢复原始的 option 列表
        $select.html(originalHtml);
        
        // 2) 过滤：移除不符合分类的 option
        if (categoryName) {
            $select.find('option').each(function() {
                var $opt = $(this);
                var cat = $opt.attr('data-category') || '';
                
                // 保留占位项
                if ($opt.val() === "" || $opt.val() === null || $opt.text().trim() === "") {
                    return;
                }
                
                // 检查是否匹配分类
                var shouldShow = cat && cat.indexOf(categoryName) >= 0;
                if (!shouldShow) {
                    $opt.remove();
                }
            });
        }
        
        // 3) 排序
        if (sortKey) {
            var $options = $select.find('option');
            var placeholders = [];
            var others = [];
            
            $options.each(function() {
                var $opt = $(this);
                var isPlaceholder = ($opt.val() === "" || $opt.val() === null || $opt.text().trim() === "");
                
                if (isPlaceholder) {
                    placeholders.push($opt);
                } else {
                    others.push($opt);
                }
            });
            
            others.sort(function(a, b) {
                var av = {};
                var bv = {};
                try { av = JSON.parse($(a).attr('data-skill-values') || "{}"); } catch (e) { av = {}; }
                try { bv = JSON.parse($(b).attr('data-skill-values') || "{}"); } catch (e) { bv = {}; }
                
                var as = Number(av[sortKey] || 0);
                var bs = Number(bv[sortKey] || 0);
                
                // 时间：升序；其它：降序
                if (sortKey === 'time') {
                    if (as !== bs) return as - bs;
                } else {
                    if (as !== bs) return bs - as;
                }
                
                // 次要排序：按稀有度降序
                var ar = Number(av.rarity || 0);
                var br = Number(bv.rarity || 0);
                if (ar !== br) return br - ar;
                
                // 最终排序：按原始顺序
                return Number($(a).attr('data-orig-order') || 0) - Number($(b).attr('data-orig-order') || 0);
            });
            
            $select.empty();
            for (var i = 0; i < placeholders.length; i++) $select.append(placeholders[i]);
            for (var j = 0; j < others.length; j++) $select.append(others[j]);
        } else if (!categoryName) {
            // 不排序且显示全部：恢复原始顺序
            var opts = $select.find('option').toArray();
            opts.sort(function(a, b) {
                return Number($(a).attr('data-orig-order') || 0) - Number($(b).attr('data-orig-order') || 0);
            });
            $select.empty().append(opts);
        }
        
        // 4) 恢复选中的值
        $select.val(currentValue);
        
        // 5) 刷新 selectpicker
        sp.refresh();
        
        // 6) 重新应用搜索关键词（如果有）
        if (searchKeyword) {
            // 延迟执行，确保 refresh 完成后再应用搜索
            setTimeout(function() {
                var $newSearchInput = sp.$menu.find('.bs-searchbox input');
                if ($newSearchInput.length) {
                    $newSearchInput.val(searchKeyword);
                    // 触发搜索
                    $newSearchInput.trigger('input');
                }
            }, 0);
        }
    }
    
    /**
     * 清空厨师选项缓存（占位函数）
     * 这个函数不需要做任何事情，只是为了保持接口兼容性
     * @public
     */
    function clearChefOptionsCache() {
    }
    
    /**
     * 显示贵客冲突提示
     * 在 .selected-sum 区域显示贵客冲突信息
     * @public
     * @param {number} ruleIndex - 规则索引
     * @param {Object} gameData - 游戏数据对象（可选，如果不传则从 calCustomRule.gameData 获取）
     */
    function displayGuestConflictWarning(ruleIndex, gameData) {
        if (!isGuestRateMode()) {
            return;
        }
        
        // 如果 gameData 参数为空，使用之前保存的 gameData
        var gameDataToUse = gameData || (typeof calCustomRule !== 'undefined' ? calCustomRule.gameData : null);
        
        var conflictInfo = checkGuestConflictsForSelectedRecipes(ruleIndex, gameDataToUse);
        
        if (conflictInfo && conflictInfo.length > 0) {
            var conflictHtml = "<div style='color:red; margin-top: 5px;'>";
            conflictHtml += "<span style='display: inline-block; vertical-align: top;'>冲突提示：</span>";
            conflictHtml += "<span style='display: inline-block;'>";
            conflictInfo.forEach(function(conflict, index) {
                if (index > 0) conflictHtml += "<br>";
                conflictHtml += conflict.guestName + "（" + conflict.recipes.join("、") + "）";
            });
            conflictHtml += "</span>";
            conflictHtml += "</div>";
            $(".cal-custom-item:eq(" + ruleIndex + ") .selected-sum").append(conflictHtml);
        }
    }
    
    /**
     * 刷新所有菜谱选择框的冲突检测
     * 遍历所有菜谱选择框，重新触发冲突检测
     * @public
     */
    function refreshAllRecipeConflictDetection() {
        if (!isGuestRateMode()) {
            return;
        }
        
        // 遍历所有菜谱选择框，重新触发冲突检测
        $('.cal-custom-item .recipe-box select').each(function() {
            var $select = $(this);
            if ($select.data('selectpicker')) {
                refreshConflictDetection($select);
            }
        });
    }
    
    // 更新暴露的公共接口
    return {
        init: init,
        calculateResults: calculateResults,
        calculateDualRecipe: calculateDualRecipe,
        calculateFields: calculateFields,
        updateSummaryDisplay: updateSummaryDisplay,
        isGuestRateMode: isGuestRateMode,
        analyzeChefGuestRateSkills: analyzeChefGuestRateSkills,
        initChefCategoryTabs: initChefCategoryTabs,
        clearChefOptionsCache: clearChefOptionsCache,
        checkGuestConflictsForSelectedRecipes: checkGuestConflictsForSelectedRecipes,
        refreshConflictDetection: refreshConflictDetection,
        displayGuestConflictWarning: displayGuestConflictWarning,
        refreshAllRecipeConflictDetection: refreshAllRecipeConflictDetection,
        addRuneAndGuestInfoToRecipeOption: addRuneAndGuestInfoToRecipeOption
    };
    
})(jQuery);

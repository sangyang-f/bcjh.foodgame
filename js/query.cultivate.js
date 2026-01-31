/**
 * 未修炼厨师查询模块
 * 用于查询未修炼厨师的最佳菜谱组合
 * 支持NEXT厨师（只对紧邻的下一个厨师生效）和Partial厨师（对所有厨师生效）
 */

// ==================== 修炼查询模式分类Tab ====================

// 保存当前选中的分类状态
var globalCultivationCategory = null;

// 保存原始的option HTML（用于恢复）
var cultivationOriginalOptionsHtml = {};

// 厨具分类状态
var globalCultivationEquipCategory = null;
var cultivationEquipOriginalOptionsHtml = {};

// 菜谱分类状态
var globalCultivationRecipeCategory = null;
var cultivationRecipeOriginalOptionsHtml = {};

/**
 * 初始化修炼查询模式的厨师分类标签
 * 在页面加载时调用，绑定shown.bs.select事件
 */
function initCultivationCategoryTabs() {
    console.log("[Cultivation] initCultivationCategoryTabs called, select count:", $("select.select-picker-chef").length);
    
    $("select.select-picker-chef").on("shown.bs.select", function() {
        console.log("[Cultivation] shown.bs.select triggered");
        
        // 只在修炼查询模式下显示分类标签
        var isUnultimatedMode = $("#chk-unultimated-mode").prop("checked");
        var isGuestRateModeFlag = calCustomRule && calCustomRule.isGuestRate === true;
        
        console.log("[Cultivation] isUnultimatedMode:", isUnultimatedMode, "isGuestRateMode:", isGuestRateModeFlag);
        
        // 如果不是修炼查询模式，或者是贵客率模式，移除分类标签
        if (!isUnultimatedMode || isGuestRateModeFlag) {
            $(this).parent().find('.dropdown-menu .cultivation-category-tabs').remove();
            return;
        }
        
        var $select = $(this);
        var selectId = $select.attr('id') || ('cultivation-select-' + Math.random().toString(36).substr(2, 9));
        $select.attr('id', selectId);
        
        var sp = $select.data('selectpicker');
        var $dropdown = sp && sp.$menu ? sp.$menu : $select.parent().find('.dropdown-menu');
        
        console.log("[Cultivation] $dropdown found:", $dropdown.length > 0);
        
        if (!$dropdown || !$dropdown.length) {
            return;
        }
        
        // 每次打开时都保存当前的 option HTML（获取最新数据）
        cultivationOriginalOptionsHtml[selectId] = $select.html();
        
        var tabsClass = "cultivation-category-tabs";
        
        // 创建分类标签（如果不存在）
        if (!$dropdown.find('.' + tabsClass).length) {
            console.log("[Cultivation] Creating tabs");
            var tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '" style="margin: 5px 10px; border-bottom: 1px solid #ddd;">' +
                '<li class="active"><a href="#" class="tab-unultimated" data-category="unultimated-chef-category" style="padding: 5px 10px; font-size: 12px;">未修炼</a></li>' +
                '<li><a href="#" class="tab-aura" data-category="aura-chef-category" style="padding: 5px 10px; font-size: 12px;">光环厨师</a></li>' +
                '<li><a href="#" class="tab-all" style="padding: 5px 10px; font-size: 12px;">全部</a></li>' +
                '</ul>';
            
            var $searchBox = $dropdown.find('.bs-searchbox');
            if ($searchBox.length) {
                $searchBox.after(tabsHtml);
            } else {
                $dropdown.prepend(tabsHtml);
            }
        }
        
        // 绑定标签点击事件
        $dropdown.find('.' + tabsClass + ' a').off('click').on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            var $tab = $(this);
            var categoryName = $tab.attr('data-category') || null;
            
            // 更新标签状态
            $tab.parent().addClass('active').siblings().removeClass('active');
            
            // 保存分类状态
            globalCultivationCategory = { category: categoryName };
            
            // 过滤厨师列表
            filterCultivationChefs($select, selectId, categoryName);
            
            return false;
        });
        
        // 恢复之前选中的分类状态，或默认选择第一个分类（未修炼）
        if (globalCultivationCategory && globalCultivationCategory.category !== null) {
            $dropdown.find('.' + tabsClass + ' li').removeClass('active');
            var $targetTab = $dropdown.find('.' + tabsClass + ' a[data-category="' + globalCultivationCategory.category + '"]');
            if ($targetTab.length) {
                $targetTab.parent().addClass('active');
                // 应用过滤
                filterCultivationChefs($select, selectId, globalCultivationCategory.category);
            } else {
                // 默认选择第一个分类
                $dropdown.find('.tab-unultimated').parent().addClass('active');
                globalCultivationCategory = { category: 'unultimated-chef-category' };
                filterCultivationChefs($select, selectId, 'unultimated-chef-category');
            }
        } else {
            // 初始化时默认选择第一个分类（未修炼）
            globalCultivationCategory = { category: 'unultimated-chef-category' };
            filterCultivationChefs($select, selectId, 'unultimated-chef-category');
        }
    });
    
    // 厨具选择框分类标签
    $("select.select-picker-equip").on("shown.bs.select", function() {
        // 只在修炼查询模式下显示分类标签
        var isUnultimatedMode = $("#chk-unultimated-mode").prop("checked");
        var isGuestRateModeFlag = calCustomRule && calCustomRule.isGuestRate === true;
        
        // 如果不是修炼查询模式，或者是贵客率模式，移除分类标签
        if (!isUnultimatedMode || isGuestRateModeFlag) {
            $(this).parent().find('.dropdown-menu .cultivation-equip-category-tabs').remove();
            return;
        }
        
        var $select = $(this);
        var selectId = $select.attr('id') || ('cultivation-equip-select-' + Math.random().toString(36).substr(2, 9));
        $select.attr('id', selectId);
        
        var sp = $select.data('selectpicker');
        var $dropdown = sp && sp.$menu ? sp.$menu : $select.parent().find('.dropdown-menu');
        
        if (!$dropdown || !$dropdown.length) {
            return;
        }
        
        // 每次打开时都保存当前的 option HTML（获取最新数据）
        cultivationEquipOriginalOptionsHtml[selectId] = $select.html();
        
        var tabsClass = "cultivation-equip-category-tabs";
        
        // 创建分类标签（如果不存在）
        if (!$dropdown.find('.' + tabsClass).length) {
            var tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '" style="margin: 5px 10px; border-bottom: 1px solid #ddd;">' +
                '<li class="active"><a href="#" class="tab-god-recommend" data-category="god-recommend-category" style="padding: 5px 10px; font-size: 12px;">神级推荐</a></li>' +
                '<li><a href="#" class="tab-all" style="padding: 5px 10px; font-size: 12px;">全部</a></li>' +
                '</ul>';
            
            var $searchBox = $dropdown.find('.bs-searchbox');
            if ($searchBox.length) {
                $searchBox.after(tabsHtml);
            } else {
                $dropdown.prepend(tabsHtml);
            }
        }
        
        // 绑定标签点击事件
        $dropdown.find('.' + tabsClass + ' a').off('click').on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            var $tab = $(this);
            var categoryName = $tab.attr('data-category') || null;
            
            // 更新标签状态
            $tab.parent().addClass('active').siblings().removeClass('active');
            
            // 保存分类状态
            globalCultivationEquipCategory = { category: categoryName };
            
            // 过滤厨具列表（神级推荐逻辑暂不实现，只保持全部逻辑）
            filterCultivationEquips($select, selectId, categoryName);
            
            return false;
        });
        
        // 恢复之前选中的分类状态，或默认选择第一个分类（神级推荐）
        if (globalCultivationEquipCategory && globalCultivationEquipCategory.category !== null) {
            $dropdown.find('.' + tabsClass + ' li').removeClass('active');
            var $targetTab = $dropdown.find('.' + tabsClass + ' a[data-category="' + globalCultivationEquipCategory.category + '"]');
            if ($targetTab.length) {
                $targetTab.parent().addClass('active');
                // 应用过滤
                filterCultivationEquips($select, selectId, globalCultivationEquipCategory.category);
            } else {
                // 默认选择第一个分类
                $dropdown.find('.tab-god-recommend').parent().addClass('active');
                globalCultivationEquipCategory = { category: 'god-recommend-category' };
                filterCultivationEquips($select, selectId, 'god-recommend-category');
            }
        } else {
            // 初始化时默认选择第一个分类（神级推荐）
            globalCultivationEquipCategory = { category: 'god-recommend-category' };
            filterCultivationEquips($select, selectId, 'god-recommend-category');
        }
    });
    
    // 菜谱选择框分类标签
    $("select.select-picker-recipe").on("shown.bs.select", function() {
        // 只在修炼查询模式下显示分类标签
        var isUnultimatedMode = $("#chk-unultimated-mode").prop("checked");
        var isGuestRateModeFlag = calCustomRule && calCustomRule.isGuestRate === true;
        
        // 如果不是修炼查询模式，或者是贵客率模式，移除分类标签
        if (!isUnultimatedMode || isGuestRateModeFlag) {
            $(this).parent().find('.dropdown-menu .cultivation-recipe-category-tabs').remove();
            return;
        }
        
        var $select = $(this);
        var selectId = $select.attr('id') || ('cultivation-recipe-select-' + Math.random().toString(36).substr(2, 9));
        $select.attr('id', selectId);
        
        var sp = $select.data('selectpicker');
        var $dropdown = sp && sp.$menu ? sp.$menu : $select.parent().find('.dropdown-menu');
        
        if (!$dropdown || !$dropdown.length) {
            return;
        }
        
        // 每次打开时都保存当前的 option HTML（获取最新数据）
        cultivationRecipeOriginalOptionsHtml[selectId] = $select.html();
        
        var tabsClass = "cultivation-recipe-category-tabs";
        
        // 创建分类标签（如果不存在）
        if (!$dropdown.find('.' + tabsClass).length) {
            var tabsHtml = '<ul class="nav nav-tabs ' + tabsClass + '" style="margin: 5px 10px; border-bottom: 1px solid #ddd;">' +
                '<li class="active"><a href="#" class="tab-quest" data-category="quest-recipe-category" style="padding: 5px 10px; font-size: 12px;">修炼任务</a></li>' +
                '<li><a href="#" class="tab-all" style="padding: 5px 10px; font-size: 12px;">全部</a></li>' +
                '</ul>';
            
            var $searchBox = $dropdown.find('.bs-searchbox');
            if ($searchBox.length) {
                $searchBox.after(tabsHtml);
            } else {
                $dropdown.prepend(tabsHtml);
            }
        }
        
        // 绑定标签点击事件
        $dropdown.find('.' + tabsClass + ' a').off('click').on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            var $tab = $(this);
            var categoryName = $tab.attr('data-category') || null;
            
            // 更新标签状态
            $tab.parent().addClass('active').siblings().removeClass('active');
            
            // 保存分类状态
            globalCultivationRecipeCategory = { category: categoryName };
            
            // 过滤菜谱列表
            filterCultivationRecipes($select, selectId, categoryName);
            
            return false;
        });
        
        // 恢复之前选中的分类状态，或默认选择第一个分类（修炼任务）
        if (globalCultivationRecipeCategory && globalCultivationRecipeCategory.category !== null) {
            $dropdown.find('.' + tabsClass + ' li').removeClass('active');
            var $targetTab = $dropdown.find('.' + tabsClass + ' a[data-category="' + globalCultivationRecipeCategory.category + '"]');
            if ($targetTab.length) {
                $targetTab.parent().addClass('active');
                // 应用过滤
                filterCultivationRecipes($select, selectId, globalCultivationRecipeCategory.category);
            } else {
                // 默认选择第一个分类
                $dropdown.find('.tab-quest').parent().addClass('active');
                globalCultivationRecipeCategory = { category: 'quest-recipe-category' };
                filterCultivationRecipes($select, selectId, 'quest-recipe-category');
            }
        } else {
            // 初始化时默认选择第一个分类（修炼任务）
            globalCultivationRecipeCategory = { category: 'quest-recipe-category' };
            filterCultivationRecipes($select, selectId, 'quest-recipe-category');
        }
    });
}

/**
 * 根据分类过滤厨具列表（修改option元素，然后刷新selectpicker）
 */
function filterCultivationEquips($select, selectId, categoryName) {
    var sp = $select.data('selectpicker');
    if (!sp) return;
    
    // 保存当前选中的值
    var currentValue = $select.val();
    
    // 保存当前的搜索关键词
    var $searchInput = sp.$menu.find('.bs-searchbox input');
    var searchKeyword = $searchInput.length ? $searchInput.val() : '';
    
    // 移除之前的空提示
    sp.$menu.find('.cultivation-equip-empty-tip').remove();
    
    // 根据分类选择使用哪个选项列表
    if (categoryName === 'god-recommend-category') {
        // 神级推荐：使用过滤后的选项
        var originalHtml = cultivationEquipOriginalOptionsHtml[selectId];
        if (originalHtml) {
            $select.html(originalHtml);
        }
        
        // 从当前选项中提取所有厨具ID（这些是已经被getGodRecommendEquipIds筛选过的）
        var currentEquipIds = [];
        $select.find('option').each(function() {
            var equipId = $(this).val();
            if (equipId && equipId !== "") {
                currentEquipIds.push(String(equipId));
            }
        });
        
        // 获取所有厨具的可提升信息
        var equipDetails = getGodRecommendEquipDetailsForAll($select, currentEquipIds);
        console.log("[filterCultivationEquips] currentEquipIds:", currentEquipIds.length, "equipDetails:", equipDetails);
        
        // 检查是否有推荐厨具（排除空值选项）
        var hasRecommendEquips = currentEquipIds.length > 0;
        
        // 为每个厨具添加可提升信息（不需要再过滤，因为选项已经是筛选过的）
        $select.find('option').each(function() {
            var $opt = $(this);
            var equipId = $opt.val();
            
            // 跳过占位项（无厨具）
            if (equipId === "" || equipId === null) {
                return;
            }
            
            // 神级推荐分类中，移除warning-skill class，防止厨具名变红
            var currentClass = $opt.attr('class') || '';
            if (currentClass.indexOf('warning-skill') >= 0) {
                $opt.attr('class', currentClass.replace(/warning-skill/g, '').trim());
            }
            
            // 添加神级信息到选项内容
            if (equipDetails && equipDetails[String(equipId)]) {
                var godRecipeNames = equipDetails[String(equipId)].godRecipeNames;
                if (godRecipeNames && godRecipeNames.length > 0) {
                    var currentContent = $opt.attr('data-content') || $opt.text();
                    var godInfo = '<span style="color:#333;font-size:11px;margin-left:5px;">可提升(<span style="color:#337ab7;">' + godRecipeNames.join('、') + '</span>)为神级</span>';
                    // 在星级后添加神级信息
                    if (currentContent.indexOf('</span>') > 0) {
                        // 找到第一个</span>后插入
                        var firstSpanEnd = currentContent.indexOf('</span>') + 7;
                        currentContent = currentContent.substring(0, firstSpanEnd) + godInfo + currentContent.substring(firstSpanEnd);
                    } else {
                        currentContent += godInfo;
                    }
                    $opt.attr('data-content', currentContent);
                }
            }
        });
        
        // 如果没有推荐厨具，显示提示
        if (!hasRecommendEquips) {
            // 刷新后添加提示
            setTimeout(function() {
                var $innerList = sp.$menu.find('.inner');
                if ($innerList.length && !sp.$menu.find('.cultivation-equip-empty-tip').length) {
                    $innerList.before('<div class="cultivation-equip-empty-tip" style="padding: 10px; text-align: center; color: #888; font-size: 13px;">无推荐厨具</div>');
                }
            }, 0);
        }
    } else {
        // 全部分类：使用完整的选项列表
        var fullHtml = window.cultivationEquipFullOptionsHtml && window.cultivationEquipFullOptionsHtml[selectId];
        if (fullHtml) {
            $select.html(fullHtml);
        } else {
            // 如果没有保存完整选项，使用原始选项
            var originalHtml = cultivationEquipOriginalOptionsHtml[selectId];
            if (originalHtml) {
                $select.html(originalHtml);
            }
        }
    }
    
    // 恢复选中的值
    $select.val(currentValue);
    
    // 刷新selectpicker
    sp.refresh();
    
    // 重新应用搜索关键词（如果有）
    if (searchKeyword) {
        setTimeout(function() {
            var $newSearchInput = sp.$menu.find('.bs-searchbox input');
            if ($newSearchInput.length) {
                $newSearchInput.val(searchKeyword);
                $newSearchInput.trigger('input');
            }
        }, 0);
    }
}

/**
 * 获取满足厨师修炼任务条件的菜谱ID列表（用于getCustomRecipesOptions）
 * 条件：满足技法要求、星级要求，不需要满足品级要求
 * 排序：品级降序 > 神差值升序 > 时间升序 > 任务要求星级优先
 */
function getQuestMatchingRecipeIdsForOptions(ruleIndex, chefIndex, chef) {
    if (!chef || !chef.chefId) {
        return null;
    }
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule) {
        return null;
    }
    
    // 获取厨师的第一个修炼任务
    var quest = getChefFirstUltimateQuestForCultivation(chef.chefId);
    
    if (!quest || !quest.conditions) {
        return null;
    }
    
    // 获取任务要求的星级（rarity）
    var questRarity = 0;
    for (var c = 0; c < quest.conditions.length; c++) {
        if (quest.conditions[c].rarity) {
            questRarity = quest.conditions[c].rarity;
            break;
        }
    }
    
    // 获取可用菜谱列表
    var menus = rule.menus || [];
    var gotChecked = $("#chk-cal-got").prop("checked");
    
    // 筛选满足修炼任务条件的菜谱（不检查品级）
    var matchingRecipes = [];
    
    for (var i = 0; i < menus.length; i++) {
        var recipe = menus[i].recipe && menus[i].recipe.data;
        if (!recipe || !recipe.recipeId) continue;
        
        // 检查是否已拥有
        if (gotChecked && !recipe.got) continue;
        
        // 检查是否满足修炼任务条件（不检查品级）
        if (checkRecipeMatchQuestConditionsWithoutRank(recipe, quest)) {
            // 计算神差值（达到神级需要的技法差值）
            var skillDiff = calculateSkillDiffForQuestRecipe(chef, recipe);
            
            // 计算品级（根据厨师技法判断能达到的最高品级）
            var rank = calculateRecipeRank(chef, recipe);
            
            matchingRecipes.push({
                recipeId: String(recipe.recipeId),
                recipe: recipe,
                rank: rank,
                skillDiff: skillDiff,
                time: recipe.time || 0,
                rarity: recipe.rarity || 0,
                questRarity: questRarity
            });
        }
    }
    
    // 排序：品级降序 > 神差值升序 > 时间升序 > 任务要求星级优先
    matchingRecipes.sort(function(a, b) {
        if (b.rank !== a.rank) return b.rank - a.rank;
        if (a.skillDiff !== b.skillDiff) return a.skillDiff - b.skillDiff;
        if (a.time !== b.time) return a.time - b.time;
        var aRarityMatch = (a.rarity === a.questRarity) ? 0 : 1;
        var bRarityMatch = (b.rarity === b.questRarity) ? 0 : 1;
        if (aRarityMatch !== bRarityMatch) return aRarityMatch - bRarityMatch;
        return a.rarity - b.rarity;
    });
    
    // 返回排序后的菜谱ID列表
    var result = [];
    for (var i = 0; i < matchingRecipes.length; i++) {
        result.push(matchingRecipes[i].recipeId);
    }
    
    return result;
}

/**
 * 根据分类过滤菜谱列表
 */
function filterCultivationRecipes($select, selectId, categoryName) {
    var sp = $select.data('selectpicker');
    if (!sp) return;
    
    // 保存当前选中的值
    var currentValue = $select.val();
    
    // 保存当前的搜索关键词
    var $searchInput = sp.$menu.find('.bs-searchbox input');
    var searchKeyword = $searchInput.length ? $searchInput.val() : '';
    
    // 根据分类选择使用缓存的选项列表
    if (categoryName === 'quest-recipe-category') {
        // 修炼任务分类：使用缓存的修炼任务选项
        var questHtml = window.cultivationRecipeQuestOptionsHtml && window.cultivationRecipeQuestOptionsHtml[selectId];
        if (questHtml) {
            $select.html(questHtml);
        } else {
            // 如果没有缓存，使用原始选项
            var originalHtml = cultivationRecipeOriginalOptionsHtml[selectId];
            if (originalHtml) {
                $select.html(originalHtml);
            }
        }
    } else {
        // 全部分类：使用缓存的完整选项列表
        var fullHtml = window.cultivationRecipeFullOptionsHtml && window.cultivationRecipeFullOptionsHtml[selectId];
        if (fullHtml) {
            $select.html(fullHtml);
        } else {
            // 如果没有缓存，使用原始选项
            var originalHtml = cultivationRecipeOriginalOptionsHtml[selectId];
            if (originalHtml) {
                $select.html(originalHtml);
            }
        }
    }
    
    // 恢复选中的值
    $select.val(currentValue);
    
    // 刷新selectpicker
    sp.refresh();
    
    // 重新应用搜索关键词（如果有）
    if (searchKeyword) {
        setTimeout(function() {
            var $newSearchInput = sp.$menu.find('.bs-searchbox input');
            if ($newSearchInput.length) {
                $newSearchInput.val(searchKeyword);
                $newSearchInput.trigger('input');
            }
        }, 0);
    }
}

/**
 * 获取满足厨师修炼任务条件的菜谱ID列表
 * 条件：满足技法要求、星级要求，不需要满足品级要求
 * 排序：品级降序 > 神差值升序 > 时间升序 > 任务要求星级优先
 */
function getQuestMatchingRecipeIds($select) {
    console.log("[修炼任务菜谱] getQuestMatchingRecipeIds called");
    
    // 获取当前厨师位置
    var $selectedItem = $select.closest('.selected-item');
    var $calCustomItem = $select.closest('.cal-custom-item');
    var ruleIndex = $(".cal-custom-item").index($calCustomItem);
    var chefIndex = $calCustomItem.find(".selected-item").index($selectedItem);
    
    if (ruleIndex < 0 || chefIndex < 0) {
        return null;
    }
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) {
        return null;
    }
    
    var customData = rule.custom[chefIndex];
    var chef = customData.chef;
    
    // 如果没有选择厨师，返回null（显示全部）
    if (!chef || !chef.chefId) {
        return null;
    }
    
    // 获取厨师的第一个修炼任务
    var quest = getChefFirstUltimateQuestForCultivation(chef.chefId);
    
    if (!quest || !quest.conditions) {
        return null;
    }
    
    // 获取任务要求的星级（rarity）
    var questRarity = 0;
    for (var c = 0; c < quest.conditions.length; c++) {
        if (quest.conditions[c].rarity) {
            questRarity = quest.conditions[c].rarity;
            break;
        }
    }
    
    // 获取可用菜谱列表
    var menus = rule.menus || [];
    var gotChecked = $("#chk-cal-got").prop("checked");
    
    // 筛选满足修炼任务条件的菜谱（不检查品级）
    var matchingRecipes = [];
    
    for (var i = 0; i < menus.length; i++) {
        var recipe = menus[i].recipe && menus[i].recipe.data;
        if (!recipe || !recipe.recipeId) continue;
        
        // 检查是否已拥有
        if (gotChecked && !recipe.got) continue;
        
        // 检查是否满足修炼任务条件（不检查品级）
        if (checkRecipeMatchQuestConditionsWithoutRank(recipe, quest)) {
            // 计算神差值（达到神级需要的技法差值）
            var skillDiff = calculateSkillDiffForQuestRecipe(chef, recipe);
            
            // 计算品级（根据厨师技法判断能达到的最高品级）
            var rank = calculateRecipeRank(chef, recipe);
            
            matchingRecipes.push({
                recipeId: String(recipe.recipeId),
                recipe: recipe,
                rank: rank,           // 品级：4=神, 3=特, 2=优, 1=可
                skillDiff: skillDiff, // 神差值
                time: recipe.time || 0,  // 单份时间
                rarity: recipe.rarity || 0,  // 星级
                questRarity: questRarity  // 任务要求星级
            });
        }
    }
    
    // 排序：品级降序 > 神差值升序 > 时间升序 > 任务要求星级优先
    matchingRecipes.sort(function(a, b) {
        // 1. 品级降序（神级4 > 特级3 > 优级2 > 可级1）
        if (b.rank !== a.rank) {
            return b.rank - a.rank;
        }
        
        // 2. 同品级按神差值升序（总神差值越小越靠前）
        if (a.skillDiff !== b.skillDiff) {
            return a.skillDiff - b.skillDiff;
        }
        
        // 3. 同神差值按菜谱单份时间升序
        if (a.time !== b.time) {
            return a.time - b.time;
        }
        
        // 4. 按任务要求星级排序（符合要求的星级优先）
        // 如果任务要求4星，则4星排在5星前面
        var aRarityMatch = (a.rarity === a.questRarity) ? 0 : 1;
        var bRarityMatch = (b.rarity === b.questRarity) ? 0 : 1;
        if (aRarityMatch !== bRarityMatch) {
            return aRarityMatch - bRarityMatch;
        }
        
        // 星级相同时，按星级升序
        return a.rarity - b.rarity;
    });
    
    // 返回排序后的菜谱ID列表
    var result = [];
    for (var i = 0; i < matchingRecipes.length; i++) {
        result.push(matchingRecipes[i].recipeId);
    }
    
    console.log("[修炼任务菜谱] 匹配菜谱数:", result.length);
    
    return result;
}

/**
 * 计算厨师做菜谱的神差值（达到神级需要的技法差值总和）
 */
function calculateSkillDiffForQuestRecipe(chef, recipe) {
    var totalDiff = 0;
    var godMultiplier = 4; // 神级倍率
    
    var skills = ['stirfry', 'boil', 'knife', 'fry', 'bake', 'steam'];
    for (var i = 0; i < skills.length; i++) {
        var skill = skills[i];
        var recipeNeed = recipe[skill] || 0;
        if (recipeNeed > 0) {
            var chefVal = chef[skill + 'Val'] || 0;
            var required = recipeNeed * godMultiplier;
            var diff = required - chefVal;
            if (diff > 0) {
                totalDiff += diff;
            }
        }
    }
    
    return totalDiff;
}

/**
 * 计算厨师做菜谱能达到的品级
 * 返回：4=神, 3=特, 2=优, 1=可, 0=无法制作
 */
function calculateRecipeRank(chef, recipe) {
    var skills = ['stirfry', 'boil', 'knife', 'fry', 'bake', 'steam'];
    var minRank = 4; // 从神级开始检查
    
    for (var i = 0; i < skills.length; i++) {
        var skill = skills[i];
        var recipeNeed = recipe[skill] || 0;
        if (recipeNeed > 0) {
            var chefVal = chef[skill + 'Val'] || 0;
            
            // 计算能达到的品级
            var rank = 0;
            if (chefVal >= recipeNeed * 4) {
                rank = 4; // 神级
            } else if (chefVal >= recipeNeed * 3) {
                rank = 3; // 特级
            } else if (chefVal >= recipeNeed * 2) {
                rank = 2; // 优级
            } else if (chefVal >= recipeNeed) {
                rank = 1; // 可级
            } else {
                rank = 0; // 无法制作
            }
            
            // 取所有技法中的最低品级
            if (rank < minRank) {
                minRank = rank;
            }
        }
    }
    
    return minRank;
}

/**
 * 获取厨师的第一个修炼任务（用于菜谱过滤）
 */
function getChefFirstUltimateQuestForCultivation(chefId) {
    console.log("[修炼任务] getChefFirstUltimateQuestForCultivation called, chefId:", chefId);
    
    // 从rule.chefs中获取厨师原始数据（包含ultimateGoal）
    var rule = calCustomRule.rules[0];
    if (!rule || !rule.chefs) {
        console.log("[修炼任务] rule或rule.chefs不存在");
        return null;
    }
    
    var originalChef = null;
    for (var i = 0; i < rule.chefs.length; i++) {
        if (rule.chefs[i].chefId === chefId || rule.chefs[i].chefId == chefId) {
            originalChef = rule.chefs[i];
            break;
        }
    }
    
    if (!originalChef) {
        console.log("[修炼任务] 没有找到厨师");
        return null;
    }
    
    console.log("[修炼任务] 找到厨师:", originalChef.name, "ultimateGoal:", originalChef.ultimateGoal);
    
    if (!originalChef.ultimateGoal || originalChef.ultimateGoal.length === 0) {
        console.log("[修炼任务] 厨师没有ultimateGoal");
        return null;
    }
    
    var questId = originalChef.ultimateGoal[0];
    console.log("[修炼任务] 第一个修炼任务ID:", questId);
    
    // 使用保存的cultivationGameData获取quests
    if (!cultivationGameData || !cultivationGameData.quests) {
        console.log("[修炼任务] cultivationGameData或quests不存在");
        return null;
    }
    
    console.log("[修炼任务] cultivationGameData.quests数量:", cultivationGameData.quests.length);
    
    for (var i = 0; i < cultivationGameData.quests.length; i++) {
        if (cultivationGameData.quests[i].questId === questId || cultivationGameData.quests[i].questId == questId) {
            console.log("[修炼任务] 找到任务:", cultivationGameData.quests[i].goal);
            if (cultivationGameData.quests[i].conditions) {
                return cultivationGameData.quests[i];
            }
        }
    }
    
    console.log("[修炼任务] 没有找到对应的quest，questId:", questId);
    return null;
}

/**
 * 检查菜谱是否满足修炼任务条件（不检查品级rank）
 */
function checkRecipeMatchQuestConditionsWithoutRank(recipe, quest) {
    if (!quest || !quest.conditions || quest.conditions.length === 0) {
        return false;
    }
    
    var conditions = quest.conditions;
    var matched = false;
    
    for (var o in conditions) {
        var p = true;
        var r = conditions[o];
        
        // 检查指定菜谱ID
        if (r.recipeId && r.recipeId != recipe.recipeId) p = false;
        
        // 检查材料
        if (p && r.materialId) {
            var hasMaterial = false;
            for (var u in recipe.materials) {
                if (recipe.materials[u].material == r.materialId) {
                    hasMaterial = true;
                    break;
                }
            }
            if (!hasMaterial) p = false;
        }
        
        // 检查贵客
        if (p && r.guest) {
            if (recipe.guestsVal && recipe.guestsVal.indexOf(r.guest) >= 0) {
                // 匹配
            } else if (recipe.rankGuestsVal && recipe.rankGuestsVal.indexOf(r.guest) >= 0) {
                // 匹配
            } else {
                p = false;
            }
        }
        
        // 检查任意贵客或新贵客
        if (p && (r.anyGuest || r.newGuest)) {
            if (!recipe.guestsVal && !recipe.rankGuestsVal) p = false;
        }
        
        // 检查技法
        if (p && r.skill && recipe["" + r.skill] == 0) p = false;
        
        // 检查稀有度（星级）
        if (p && r.rarity && recipe.rarity < r.rarity) p = false;
        
        // 检查价格
        if (p && r.price && recipe.price < r.price) p = false;
        
        // 检查分类
        if (p && r.category && !recipe["" + r.category]) p = false;
        
        // 检查调料
        if (p && r.condiment && recipe.condiment != r.condiment) p = false;
        
        // 不检查品级要求 (rank)
        
        if (p) {
            matched = true;
            break;
        }
    }
    
    return matched;
}

/**
 * 获取神级推荐的厨具ID列表
 * 逻辑：
 * 1. 获取当前厨师的技法值（已包含厨具、光环加成）
 * 2. 获取已选菜谱，找出未达神的菜谱
 * 3. 计算每种技法的最大神差值
 * 4. 筛选能使菜谱达神的厨具
 * 5. 按优先级排序：能补更多菜谱的优先，来源优先级，厨具ID降序
 */
function getGodRecommendEquipIds($select) {
    // 获取当前厨师位置
    var $selectedItem = $select.closest('.selected-item');
    var $calCustomItem = $select.closest('.cal-custom-item');
    var ruleIndex = $(".cal-custom-item").index($calCustomItem);
    var chefIndex = $calCustomItem.find(".selected-item").index($selectedItem);
    
    if (ruleIndex < 0 || chefIndex < 0) return null;
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) return null;
    
    var customData = rule.custom[chefIndex];
    var chef = customData.chef;
    
    // 如果没有选择厨师，返回null（显示全部）
    if (!chef || !chef.chefId) return null;
    
    // 获取已选菜谱
    var recipes = customData.recipes || [];
    var selectedRecipes = [];
    for (var i = 0; i < recipes.length; i++) {
        if (recipes[i] && recipes[i].data) {
            selectedRecipes.push(recipes[i].data);
        }
    }
    
    // 如果没有选择菜谱，返回null（显示全部）
    if (selectedRecipes.length === 0) return null;
    
    // 计算每个菜谱的神差值，找出未达神的菜谱
    // 注意：chef的技法值已经包含了当前厨具的加成，需要先减去当前厨具加成
    var currentEquip = customData.equip;
    var currentEquipBonus = createEmptySkillBonus();
    if (currentEquip && currentEquip.effect) {
        currentEquipBonus = getEquipSkillBonus(currentEquip);
    }
    
    // 计算不含当前厨具的厨师技法值
    var chefWithoutEquip = {
        stirfryVal: (chef.stirfryVal || 0) - currentEquipBonus.stirfry,
        boilVal: (chef.boilVal || 0) - currentEquipBonus.boil,
        knifeVal: (chef.knifeVal || 0) - currentEquipBonus.knife,
        fryVal: (chef.fryVal || 0) - currentEquipBonus.fry,
        bakeVal: (chef.bakeVal || 0) - currentEquipBonus.bake,
        steamVal: (chef.steamVal || 0) - currentEquipBonus.steam
    };
    
    // 找出未达神的菜谱，并计算每种技法的最大神差值
    var maxSkillDeficits = createEmptySkillBonus(); // 每种技法的最大神差值
    var notGodRecipes = []; // 未达神的菜谱列表
    
    for (var i = 0; i < selectedRecipes.length; i++) {
        var recipe = selectedRecipes[i];
        var skillDiff = calculateRecipeSkillDeficit(chefWithoutEquip, recipe);
        
        if (skillDiff.totalDeficit > 0) {
            notGodRecipes.push({
                recipe: recipe,
                deficits: skillDiff.deficits
            });
            
            // 更新每种技法的最大神差值
            for (var skill in skillDiff.deficits) {
                if (skillDiff.deficits[skill] > maxSkillDeficits[skill]) {
                    maxSkillDeficits[skill] = skillDiff.deficits[skill];
                }
            }
        }
    }
    
    // 如果所有菜谱都已达神，返回null（显示全部）
    if (notGodRecipes.length === 0) return null;
    
    // 获取可用厨具列表
    var equips = rule.equips || [];
    
    // 检查是否使用强力厨具
    var useStrongEquip = $("#chk-unultimated-use-strong-equip").prop("checked");
    var maxEquipBonus = useStrongEquip ? 999 : 100;
    
    // 筛选能使菜谱达神的厨具
    var recommendedEquips = [];
    
    for (var i = 0; i < equips.length; i++) {
        var equip = equips[i];
        if (!equip || !equip.equipId) continue;
        
        var equipBonus = getEquipSkillBonus(equip);
        var maxValue = getEquipMaxSkillValue(equip);
        
        // 如果不使用强力厨具，跳过加成值超过100的厨具
        if (!useStrongEquip && maxValue > maxEquipBonus) continue;
        
        // 检查厨具是否有需要的技法加成
        var hasNeededSkill = false;
        for (var skill in maxSkillDeficits) {
            if (maxSkillDeficits[skill] > 0 && equipBonus[skill] > 0) {
                hasNeededSkill = true;
                break;
            }
        }
        if (!hasNeededSkill) continue;
        
        // 计算这个厨具能使多少个菜谱达神
        var godCount = countEquipGodRecipes(chefWithoutEquip, notGodRecipes, equipBonus);
        
        if (godCount > 0) {
            recommendedEquips.push({
                equip: equip,
                equipId: equip.equipId,
                godCount: godCount,
                originPriority: getEquipOriginPriority(equip.origin)
            });
        }
    }
    
    // 如果没有找到能使菜谱达神的厨具，返回null（显示全部）
    if (recommendedEquips.length === 0) return null;
    
    // 按优先级排序：能补更多菜谱的优先 > 来源优先级 > 厨具ID降序
    recommendedEquips.sort(function(a, b) {
        // 1. 能补更多菜谱的优先
        if (b.godCount !== a.godCount) {
            return b.godCount - a.godCount;
        }
        // 2. 来源优先级（数字越小越优先）
        if (a.originPriority !== b.originPriority) {
            return a.originPriority - b.originPriority;
        }
        // 3. 同来源按厨具ID降序（新厨具优先）
        return b.equipId - a.equipId;
    });
    
    // 返回推荐厨具的ID列表
    var result = [];
    for (var i = 0; i < recommendedEquips.length; i++) {
        result.push(String(recommendedEquips[i].equipId));
    }
    
    return result;
}

/**
 * 计算菜谱的技法神差值
 * @returns {object} { totalDeficit: 总差值, deficits: { stirfry: x, boil: y, ... } }
 */
function calculateRecipeSkillDeficit(chef, recipe) {
    var deficits = createEmptySkillBonus();
    var totalDeficit = 0;
    
    // 神级倍率为4
    var godMultiplier = 4;
    
    var skillChecks = [
        { skill: 'stirfry', chefVal: chef.stirfryVal || 0, recipeVal: recipe.stirfry || 0 },
        { skill: 'boil', chefVal: chef.boilVal || 0, recipeVal: recipe.boil || 0 },
        { skill: 'knife', chefVal: chef.knifeVal || 0, recipeVal: recipe.knife || 0 },
        { skill: 'fry', chefVal: chef.fryVal || 0, recipeVal: recipe.fry || 0 },
        { skill: 'bake', chefVal: chef.bakeVal || 0, recipeVal: recipe.bake || 0 },
        { skill: 'steam', chefVal: chef.steamVal || 0, recipeVal: recipe.steam || 0 }
    ];
    
    for (var i = 0; i < skillChecks.length; i++) {
        var check = skillChecks[i];
        if (check.recipeVal > 0) {
            var required = check.recipeVal * godMultiplier;
            var deficit = required - check.chefVal;
            if (deficit > 0) {
                deficits[check.skill] = deficit;
                totalDeficit += deficit;
            }
        }
    }
    
    return { totalDeficit: totalDeficit, deficits: deficits };
}

/**
 * 计算厨具能使多少个菜谱达神，并返回能达神的菜谱名称列表
 */
function countEquipGodRecipes(chefWithoutEquip, notGodRecipes, equipBonus) {
    var godCount = 0;
    
    for (var i = 0; i < notGodRecipes.length; i++) {
        var recipeData = notGodRecipes[i];
        var canGod = true;
        
        // 检查每种技法的差值是否能被厨具补上
        for (var skill in recipeData.deficits) {
            if (recipeData.deficits[skill] > 0) {
                // 厨具加成是否能补上这个差值
                if (equipBonus[skill] < recipeData.deficits[skill]) {
                    canGod = false;
                    break;
                }
            }
        }
        
        if (canGod) {
            godCount++;
        }
    }
    
    return godCount;
}

/**
 * 获取厨具能提升为神级的菜谱名称列表
 */
function getEquipGodRecipeNames(chefWithoutEquip, notGodRecipes, equipBonus) {
    var godRecipeNames = [];
    
    for (var i = 0; i < notGodRecipes.length; i++) {
        var recipeData = notGodRecipes[i];
        var canGod = true;
        
        // 检查每种技法的差值是否能被厨具补上
        for (var skill in recipeData.deficits) {
            if (recipeData.deficits[skill] > 0) {
                // 厨具加成是否能补上这个差值
                if (equipBonus[skill] < recipeData.deficits[skill]) {
                    canGod = false;
                    break;
                }
            }
        }
        
        if (canGod && recipeData.recipe && recipeData.recipe.name) {
            godRecipeNames.push(recipeData.recipe.name);
        }
    }
    
    return godRecipeNames;
}

/**
 * 获取神级推荐厨具的详细信息（包括能提升哪些菜谱为神级）
 * @returns {object} { equipId: { godRecipeNames: [...] }, ... } 或 null
 */
function getGodRecommendEquipDetails($select) {
    // 获取当前厨师位置
    var $selectedItem = $select.closest('.selected-item');
    var $calCustomItem = $select.closest('.cal-custom-item');
    var ruleIndex = $(".cal-custom-item").index($calCustomItem);
    var chefIndex = $calCustomItem.find(".selected-item").index($selectedItem);
    
    if (ruleIndex < 0 || chefIndex < 0) return null;
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) return null;
    
    var customData = rule.custom[chefIndex];
    var chef = customData.chef;
    
    // 如果没有选择厨师，返回null
    if (!chef || !chef.chefId) return null;
    
    // 获取已选菜谱
    var recipes = customData.recipes || [];
    var selectedRecipes = [];
    for (var i = 0; i < recipes.length; i++) {
        if (recipes[i] && recipes[i].data) {
            selectedRecipes.push(recipes[i].data);
        }
    }
    
    // 如果没有选择菜谱，返回null
    if (selectedRecipes.length === 0) return null;
    
    // 计算不含当前厨具的厨师技法值
    var currentEquip = customData.equip;
    var currentEquipBonus = createEmptySkillBonus();
    if (currentEquip && currentEquip.effect) {
        currentEquipBonus = getEquipSkillBonus(currentEquip);
    }
    
    var chefWithoutEquip = {
        stirfryVal: (chef.stirfryVal || 0) - currentEquipBonus.stirfry,
        boilVal: (chef.boilVal || 0) - currentEquipBonus.boil,
        knifeVal: (chef.knifeVal || 0) - currentEquipBonus.knife,
        fryVal: (chef.fryVal || 0) - currentEquipBonus.fry,
        bakeVal: (chef.bakeVal || 0) - currentEquipBonus.bake,
        steamVal: (chef.steamVal || 0) - currentEquipBonus.steam
    };
    
    // 找出未达神的菜谱
    var notGodRecipes = [];
    for (var i = 0; i < selectedRecipes.length; i++) {
        var recipe = selectedRecipes[i];
        var skillDiff = calculateRecipeSkillDeficit(chefWithoutEquip, recipe);
        
        if (skillDiff.totalDeficit > 0) {
            notGodRecipes.push({
                recipe: recipe,
                deficits: skillDiff.deficits
            });
        }
    }
    
    // 如果所有菜谱都已达神，返回null
    if (notGodRecipes.length === 0) return null;
    
    // 获取可用厨具列表
    var equips = rule.equips || [];
    
    // 计算每个厨具能提升哪些菜谱为神级（不受"使用强力厨具"开关影响）
    var equipDetails = {};
    
    for (var i = 0; i < equips.length; i++) {
        var equip = equips[i];
        if (!equip || !equip.equipId) continue;
        
        var equipBonus = getEquipSkillBonus(equip);
        
        // 获取能提升为神级的菜谱名称
        var godRecipeNames = getEquipGodRecipeNames(chefWithoutEquip, notGodRecipes, equipBonus);
        
        if (godRecipeNames.length > 0) {
            equipDetails[String(equip.equipId)] = {
                godRecipeNames: godRecipeNames
            };
        }
    }
    
    return equipDetails;
}

/**
 * 获取指定厨具列表的可提升信息（用于神级推荐分类显示）
 * 只计算recommendedEquipIds中的厨具，不受"使用强力厨具"开关影响
 */
function getGodRecommendEquipDetailsForAll($select, recommendedEquipIds) {
    console.log("[可提升信息] getGodRecommendEquipDetailsForAll called, recommendedEquipIds:", recommendedEquipIds);
    
    if (!recommendedEquipIds || recommendedEquipIds.length === 0) return null;
    
    // 获取当前厨师位置
    var $selectedItem = $select.closest('.selected-item');
    var $calCustomItem = $select.closest('.cal-custom-item');
    var ruleIndex = $(".cal-custom-item").index($calCustomItem);
    var chefIndex = $calCustomItem.find(".selected-item").index($selectedItem);
    
    console.log("[可提升信息] ruleIndex:", ruleIndex, "chefIndex:", chefIndex);
    
    if (ruleIndex < 0 || chefIndex < 0) return null;
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) return null;
    
    var customData = rule.custom[chefIndex];
    var chef = customData.chef;
    
    if (!chef || !chef.chefId) return null;
    
    // 获取已选菜谱
    var recipes = customData.recipes || [];
    var selectedRecipes = [];
    for (var i = 0; i < recipes.length; i++) {
        if (recipes[i] && recipes[i].data) {
            selectedRecipes.push(recipes[i].data);
            console.log("[可提升信息] 已选菜谱:", recipes[i].data.name);
        }
    }
    
    if (selectedRecipes.length === 0) return null;
    
    // 计算不含当前厨具的厨师技法值
    var currentEquip = customData.equip;
    var currentEquipBonus = createEmptySkillBonus();
    if (currentEquip && currentEquip.effect) {
        currentEquipBonus = getEquipSkillBonus(currentEquip);
    }
    
    var chefWithoutEquip = {
        stirfryVal: (chef.stirfryVal || 0) - currentEquipBonus.stirfry,
        boilVal: (chef.boilVal || 0) - currentEquipBonus.boil,
        knifeVal: (chef.knifeVal || 0) - currentEquipBonus.knife,
        fryVal: (chef.fryVal || 0) - currentEquipBonus.fry,
        bakeVal: (chef.bakeVal || 0) - currentEquipBonus.bake,
        steamVal: (chef.steamVal || 0) - currentEquipBonus.steam
    };
    
    console.log("[可提升信息] chefWithoutEquip:", chefWithoutEquip);
    
    // 找出未达神的菜谱
    var notGodRecipes = [];
    for (var i = 0; i < selectedRecipes.length; i++) {
        var recipe = selectedRecipes[i];
        var skillDiff = calculateRecipeSkillDeficit(chefWithoutEquip, recipe);
        
        console.log("[可提升信息] 菜谱", recipe.name, "神差值:", skillDiff);
        
        if (skillDiff.totalDeficit > 0) {
            notGodRecipes.push({
                recipe: recipe,
                deficits: skillDiff.deficits
            });
        }
    }
    
    console.log("[可提升信息] 未达神菜谱数:", notGodRecipes.length);
    
    if (notGodRecipes.length === 0) return null;
    
    // 获取可用厨具列表
    var equips = rule.equips || [];
    
    // 创建厨具ID到厨具数据的映射
    var equipMap = {};
    for (var i = 0; i < equips.length; i++) {
        if (equips[i] && equips[i].equipId) {
            equipMap[String(equips[i].equipId)] = equips[i];
        }
    }
    
    // 只计算recommendedEquipIds中的厨具
    var equipDetails = {};
    for (var i = 0; i < recommendedEquipIds.length; i++) {
        var equipId = String(recommendedEquipIds[i]);
        var equip = equipMap[equipId];
        if (!equip) {
            console.log("[可提升信息] 厨具ID", equipId, "在equipMap中找不到");
            continue;
        }
        
        var equipBonus = getEquipSkillBonus(equip);
        var godRecipeNames = getEquipGodRecipeNames(chefWithoutEquip, notGodRecipes, equipBonus);
        
        console.log("[可提升信息] 厨具", equip.name, "加成:", equipBonus, "能提升菜谱:", godRecipeNames);
        
        if (godRecipeNames.length > 0) {
            equipDetails[equipId] = {
                godRecipeNames: godRecipeNames
            };
        }
    }
    
    console.log("[可提升信息] 最终equipDetails:", equipDetails);
    
    return equipDetails;
}

/**
 * 修炼模式下对厨具选项进行排序
 * 排序优先级：能补更多菜谱的优先 > 来源优先级 > 厨具ID降序
 * @param options - getCustomEquipsOptions返回的选项数组
 * @param ruleIndex - 规则索引
 * @param chefIndex - 厨师位置索引
 * @param equips - 厨具数据数组
 * @returns 排序后的选项数组
 */
function sortEquipsForCultivation(options, ruleIndex, chefIndex, equips) {
    console.log("[神级推荐] sortEquipsForCultivation called, ruleIndex:", ruleIndex, "chefIndex:", chefIndex);
    
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) {
        console.log("[神级推荐] 没有找到rule或custom数据");
        return options;
    }
    
    var customData = rule.custom[chefIndex];
    var chef = customData.chef;
    
    // 如果没有选择厨师，返回原选项
    if (!chef || !chef.chefId) {
        console.log("[神级推荐] 没有选择厨师");
        return options;
    }
    
    console.log("[神级推荐] 厨师:", chef.name, "技法值:", {
        stirfry: chef.stirfryVal,
        boil: chef.boilVal,
        knife: chef.knifeVal,
        fry: chef.fryVal,
        bake: chef.bakeVal,
        steam: chef.steamVal
    });
    
    // 获取已选菜谱
    var recipes = customData.recipes || [];
    var selectedRecipes = [];
    for (var i = 0; i < recipes.length; i++) {
        if (recipes[i] && recipes[i].data) {
            selectedRecipes.push(recipes[i].data);
            console.log("[神级推荐] 已选菜谱" + i + ":", recipes[i].data.name, "需要技法:", {
                stirfry: recipes[i].data.stirfry,
                boil: recipes[i].data.boil,
                knife: recipes[i].data.knife,
                fry: recipes[i].data.fry,
                bake: recipes[i].data.bake,
                steam: recipes[i].data.steam
            });
        }
    }
    
    // 如果没有选择菜谱，返回原选项
    if (selectedRecipes.length === 0) {
        console.log("[神级推荐] 没有选择菜谱");
        return options;
    }
    
    // 计算不含当前厨具的厨师技法值
    var currentEquip = customData.equip;
    var currentEquipBonus = createEmptySkillBonus();
    if (currentEquip && currentEquip.effect) {
        currentEquipBonus = getEquipSkillBonus(currentEquip);
        console.log("[神级推荐] 当前厨具:", currentEquip.name, "加成:", currentEquipBonus);
    }
    
    var chefWithoutEquip = {
        stirfryVal: (chef.stirfryVal || 0) - currentEquipBonus.stirfry,
        boilVal: (chef.boilVal || 0) - currentEquipBonus.boil,
        knifeVal: (chef.knifeVal || 0) - currentEquipBonus.knife,
        fryVal: (chef.fryVal || 0) - currentEquipBonus.fry,
        bakeVal: (chef.bakeVal || 0) - currentEquipBonus.bake,
        steamVal: (chef.steamVal || 0) - currentEquipBonus.steam
    };
    
    console.log("[神级推荐] 不含厨具的厨师技法值:", chefWithoutEquip);
    
    // 找出未达神的菜谱，并计算每种技法的最大神差值
    var notGodRecipes = [];
    var maxSkillDeficits = createEmptySkillBonus(); // 每种技法的最大神差值
    
    for (var i = 0; i < selectedRecipes.length; i++) {
        var recipe = selectedRecipes[i];
        var skillDiff = calculateRecipeSkillDeficit(chefWithoutEquip, recipe);
        console.log("[神级推荐] 菜谱", recipe.name, "神差值:", skillDiff);
        if (skillDiff.totalDeficit > 0) {
            notGodRecipes.push({
                recipe: recipe,
                deficits: skillDiff.deficits
            });
            // 更新每种技法的最大神差值
            for (var skill in skillDiff.deficits) {
                if (skillDiff.deficits[skill] > maxSkillDeficits[skill]) {
                    maxSkillDeficits[skill] = skillDiff.deficits[skill];
                }
            }
        }
    }
    
    console.log("[神级推荐] 未达神菜谱数量:", notGodRecipes.length, "每种技法最大神差值:", maxSkillDeficits);
    
    // 如果所有菜谱都已达神，返回原选项
    if (notGodRecipes.length === 0) {
        console.log("[神级推荐] 所有菜谱都已达神");
        return options;
    }
    
    // 创建厨具ID到厨具数据的映射
    var equipMap = {};
    for (var i = 0; i < equips.length; i++) {
        if (equips[i] && equips[i].equipId) {
            equipMap[equips[i].equipId] = equips[i];
        }
    }
    
    // 为每个选项计算能补的菜谱数量和来源优先级
    var enrichedOptions = [];
    for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var equipId = opt.value;
        var equip = equipMap[equipId];
        
        // 无厨具选项保持在最前面
        if (!equipId || equipId === "") {
            enrichedOptions.push({
                option: opt,
                godCount: -1, // 特殊值，保持在最前
                originPriority: 0,
                equipId: 0
            });
            continue;
        }
        
        if (!equip) {
            enrichedOptions.push({
                option: opt,
                godCount: 0,
                originPriority: 4,
                equipId: Number(equipId) || 0
            });
            continue;
        }
        
        var equipBonus = getEquipSkillBonus(equip);
        var godCount = countEquipGodRecipes(chefWithoutEquip, notGodRecipes, equipBonus);
        var originPriority = getEquipOriginPriority(equip.origin);
        
        if (godCount > 0) {
            console.log("[神级推荐] 厨具", equip.name, "能补", godCount, "个菜谱达神, 加成:", equipBonus);
        }
        
        enrichedOptions.push({
            option: opt,
            godCount: godCount,
            originPriority: originPriority,
            equipId: equip.equipId || 0
        });
    }
    
    // 排序：能补更多菜谱的优先 > 来源优先级 > 厨具ID降序
    enrichedOptions.sort(function(a, b) {
        // 无厨具选项保持在最前
        if (a.godCount === -1) return -1;
        if (b.godCount === -1) return 1;
        
        // 1. 能补更多菜谱的优先
        if (b.godCount !== a.godCount) {
            return b.godCount - a.godCount;
        }
        // 2. 来源优先级（数字越小越优先）
        if (a.originPriority !== b.originPriority) {
            return a.originPriority - b.originPriority;
        }
        // 3. 同来源按厨具ID降序（新厨具优先）
        return b.equipId - a.equipId;
    });
    
    // 只返回能使菜谱达神的厨具（godCount > 0），加上无厨具选项
    var result = [];
    var hasRecommended = false;
    for (var i = 0; i < enrichedOptions.length; i++) {
        if (enrichedOptions[i].godCount === -1) {
            // 无厨具选项
            result.push(enrichedOptions[i].option);
        } else if (enrichedOptions[i].godCount > 0) {
            result.push(enrichedOptions[i].option);
            hasRecommended = true;
        }
    }
    
    // 如果没有能使菜谱达神的厨具，只返回无厨具选项
    if (!hasRecommended) {
        console.log("[神级推荐] 没有厨具能使菜谱达神，返回空列表");
        result = [];
        for (var i = 0; i < enrichedOptions.length; i++) {
            if (enrichedOptions[i].godCount === -1) {
                result.push(enrichedOptions[i].option);
                break;
            }
        }
    }
    
    console.log("[神级推荐] 排序完成，返回", result.length, "个选项");
    
    return result;
}

/**
 * 根据分类过滤厨师列表（修改option元素，然后刷新selectpicker）
 */
function filterCultivationChefs($select, selectId, categoryName) {
    var sp = $select.data('selectpicker');
    if (!sp) return;
    
    // 保存当前选中的值
    var currentValue = $select.val();
    
    // 保存当前的搜索关键词
    var $searchInput = sp.$menu.find('.bs-searchbox input');
    var searchKeyword = $searchInput.length ? $searchInput.val() : '';
    
    // 恢复原始的option列表
    var originalHtml = cultivationOriginalOptionsHtml[selectId];
    if (originalHtml) {
        $select.html(originalHtml);
    }
    
    // 过滤：移除不符合分类的option
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
    
    // 恢复选中的值
    $select.val(currentValue);
    
    // 刷新selectpicker
    sp.refresh();
    
    // 重新应用搜索关键词（如果有）
    if (searchKeyword) {
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

// ==================== 初始化和配置 ====================

// 保存gameData的全局引用，供其他函数使用
var cultivationGameData = null;

/**
 * 初始化未修炼厨师下拉框功能
 */
function initUnultimatedChefDropdown(gameData) {
    // 保存gameData到全局变量
    cultivationGameData = gameData;
    
    // 只在正常营业规则下显示（ID为0或"0"），且不在贵客率计算模式下
    var ruleId = String(calCustomRule.id);
    var isGuestRateMode = calCustomRule && calCustomRule.isGuestRate === true;
    
    if (ruleId !== "0" || isGuestRateMode) {
        // 关闭修炼查询模式开关
        $("#chk-unultimated-mode").bootstrapToggle("off");
        $("#unultimated-mode-wrapper").addClass("hidden");
        $("#unultimated-chef-wrapper").addClass("hidden");
        $("#unultimated-chef-action-wrapper").addClass("hidden");
        return;
    }
    
    // 显示修炼模式开关
    $("#unultimated-mode-wrapper").removeClass("hidden");
    
    // 初始化修炼模式开关
    initUnultimatedModeToggle(gameData);
    
    // 初始化配置开关状态（从本地存储读取）
    initUnultimatedConfig();
    
    // 初始化查询按钮事件
    initUnultimatedQueryButton(gameData);
    
    // 弹窗显示时移除配置按钮焦点
    $("#unultimated-config-modal").off("shown.bs.modal").on("shown.bs.modal", function() {
        $("#btn-unultimated-config").blur();
    });
}

/**
 * 初始化修炼模式开关
 */
function initUnultimatedModeToggle(gameData) {
    // 默认关闭状态
    $("#chk-unultimated-mode").bootstrapToggle("off");
    $("#unultimated-chef-wrapper").addClass("hidden");
    $("#unultimated-chef-action-wrapper").addClass("hidden");
    // 确保调料选择框显示
    $(".condiment-box").removeClass("hidden");
    
    // 监听开关变化
    $("#chk-unultimated-mode").off("change").on("change", function() {
        var isEnabled = $(this).prop("checked");
        
        if (isEnabled) {
            // 修炼模式开启时，自动勾选"已有"开关
            if (!$("#chk-cal-got").prop("checked")) {
                $("#chk-cal-got").prop("checked", true).trigger("change");
            }
            $("#unultimated-chef-wrapper").removeClass("hidden");
            $("#unultimated-chef-action-wrapper").removeClass("hidden");
            // 隐藏调料选择框
            $(".condiment-box").addClass("hidden");
            refreshUnultimatedChefList(gameData);
        } else {
            // 关闭时不取消勾选已有
            $("#unultimated-chef-wrapper").addClass("hidden");
            $("#unultimated-chef-action-wrapper").addClass("hidden");
            // 显示调料选择框
            $(".condiment-box").removeClass("hidden");
        }
    });
}

/**
 * 初始化厨师修炼查询配置
 */
function initUnultimatedConfig() {
    var localData = getLocalData();
    var config = localData.unultimatedConfig || {};
    
    // 设置开关状态
    if (config.useStrongEquip) {
        $("#chk-unultimated-use-strong-equip").bootstrapToggle("on");
    } else {
        $("#chk-unultimated-use-strong-equip").bootstrapToggle("off");
    }
    
    if (config.useNoRecipe) {
        $("#chk-unultimated-use-no-recipe").bootstrapToggle("on");
    } else {
        $("#chk-unultimated-use-no-recipe").bootstrapToggle("off");
    }
    
    // 监听开关变化，保存到本地存储
    $("#chk-unultimated-use-strong-equip").off("change").on("change", function() {
        saveUnultimatedConfig();
    });
    
    $("#chk-unultimated-use-no-recipe").off("change").on("change", function() {
        saveUnultimatedConfig();
    });
}

/**
 * 保存厨师修炼查询配置
 */
function saveUnultimatedConfig() {
    var config = {
        useStrongEquip: $("#chk-unultimated-use-strong-equip").prop("checked"),
        useNoRecipe: $("#chk-unultimated-use-no-recipe").prop("checked")
    };
    updateLocalData("unultimatedConfig", config);
}

/**
 * 刷新未修炼厨师列表
 */
function refreshUnultimatedChefList(gameData) {
    var rule = calCustomRule.rules[0];
    if (!rule || !rule.chefs) return;
    
    var localData = getLocalData();
    var configIds = getConfigUltimatedChefIds();
    var gotChecked = $("#chk-cal-got").prop("checked");
    
    // 获取当前已选中的厨师ID（转为字符串Set便于查找）
    var selectedIds = $("#select-cal-unultimated-chef").val() || [];
    var selectedSet = {};
    for (var s = 0; s < selectedIds.length; s++) {
        selectedSet[String(selectedIds[s])] = true;
    }
    
    var list = [];
    var validSelectedIds = []; // 过滤后仍然有效的已选ID
    
    for (var i = 0; i < rule.chefs.length; i++) {
        var chef = rule.chefs[i];
        
        if (chef.chefId == 285) continue;
        
        // 勾选已有，只显示已有且未修炼的厨师
        if (gotChecked) {
            var isOwned = chef.got || (configIds.allSet && configIds.allSet[String(chef.chefId)]);
            if (!isOwned) continue;
            // 跳过已修炼的
            if (isChefUltimated(chef.chefId, localData, configIds)) continue;
        }
        
        // 标记是否已选中
        var isSelected = selectedSet[String(chef.chefId)] === true;
        chef._isSelected = isSelected;
        if (isSelected) {
            validSelectedIds.push(String(chef.chefId));
        }
        list.push(chef);
    }
    
    // 排序：已选中的优先，然后按星级降序
    list.sort(function(a, b) {
        if (a._isSelected !== b._isSelected) {
            return a._isSelected ? -1 : 1;
        }
        return b.rarity - a.rarity;
    });
    
    // 生成选项，使用data-content显示厨师名、星级、修炼任务和修炼技能（换行显示）
    var html = '';
    for (var j = 0; j < list.length; j++) {
        var questDesc = '';
        if (list[j].ultimateGoal && list[j].ultimateGoal.length > 0 && cultivationGameData && cultivationGameData.quests) {
            var questId = list[j].ultimateGoal[0];
            for (var q = 0; q < cultivationGameData.quests.length; q++) {
                if (cultivationGameData.quests[q].questId === questId) {
                    questDesc = cultivationGameData.quests[q].goal || '';
                    break;
                }
            }
        }
        // 获取修炼技能描述
        var skillDesc = list[j].ultimateSkillDisp ? list[j].ultimateSkillDisp.replace(/<br>/g, ' ') : '';
        
        var contentHtml = '<div style="line-height:1.3;padding:5px 0;border-bottom:1px solid #eee;">' +
                          '<span class="name">' + list[j].name + '</span>' +
                          '<span class="subtext" style="margin-left:5px;">' + list[j].rarityDisp + '</span>';
        if (questDesc) {
            contentHtml += '<br><span style="color:#888;font-size:11px;">' + questDesc + '</span>';
        }
        if (skillDesc) {
            contentHtml += '<br><span style="color:#337ab7;font-size:11px;">' + skillDesc + '</span>';
        }
        contentHtml += '</div>';
        html += '<option value="' + list[j].chefId + '" data-content="' + contentHtml.replace(/"/g, '&quot;') + '" data-tokens="' + list[j].name + '">' + list[j].name + '</option>';
    }
    
    $("#select-cal-unultimated-chef").html(html).selectpicker("destroy").selectpicker({
        selectedTextFormat: 'count',
        countSelectedText: '{0}个厨师'
    });
    
    // 恢复选中状态（只恢复过滤后仍有效的）
    if (validSelectedIds.length > 0) {
        $("#select-cal-unultimated-chef").selectpicker('val', validSelectedIds);
    }
    
    // 在下拉框内添加清空按钮
    addClearButtonToUnultimatedDropdown();
    
    // 重新绑定选择变化事件（selectpicker destroy后需要重新绑定）
    $("#select-cal-unultimated-chef").off("changed.bs.select").on("changed.bs.select", function() {
        refreshUnultimatedChefSort();
        updateUnultimatedChefDisplayText();
    });
    
    // 初始化时也更新显示文本
    updateUnultimatedChefDisplayText();
}

/**
 * 更新未修炼厨师选择框的显示文本
 * 选择1个厨师时只显示厨师名字，不显示星级
 */
function updateUnultimatedChefDisplayText() {
    var $select = $("#select-cal-unultimated-chef");
    var selectedVal = $select.val() || [];
    var $button = $select.closest(".bootstrap-select").find("button.dropdown-toggle");
    var $filterOption = $button.find(".filter-option-inner-inner");
    
    // 如果找不到新版结构，尝试旧版结构
    if (!$filterOption.length) {
        $filterOption = $button.find(".filter-option");
    }
    
    if (!$filterOption.length) {
        return;
    }
    
    if (selectedVal.length === 0) {
        // 没有选择时显示默认文本
        $filterOption.text("未修炼厨师");
    } else if (selectedVal.length === 1) {
        // 只选择1个时，只显示厨师名字（不显示星级）
        var $selectedOption = $select.find('option[value="' + selectedVal[0] + '"]');
        var chefName = $selectedOption.text() || '已选择1个';
        $filterOption.text(chefName);
    } else {
        // 选择多个时显示数量
        $filterOption.text(selectedVal.length + '个厨师');
    }
}

/**
 * 在未修炼厨师下拉框内添加清空按钮
 */
function addClearButtonToUnultimatedDropdown() {
    var $dropdown = $("#select-cal-unultimated-chef").closest(".bootstrap-select").find(".dropdown-menu");
    
    // 如果已经有清空按钮，先移除
    $dropdown.find(".unultimated-clear-btn").remove();
    
    // 在搜索框后面添加清空按钮
    var $searchBox = $dropdown.find(".bs-searchbox");
    if ($searchBox.length) {
        var clearBtn = '<div class="unultimated-clear-btn" style="padding: 3px 8px; border-bottom: 1px solid #ddd;">' +
            '<button type="button" class="btn btn-default btn-xs btn-block" style="font-size: 12px;">清空已选</button>' +
            '</div>';
        $searchBox.after(clearBtn);
        
        // 绑定点击事件
        $dropdown.find(".unultimated-clear-btn button").off("click").on("click", function(e) {
            e.stopPropagation();  // 阻止事件冒泡，防止关闭下拉框
            $("#select-cal-unultimated-chef").selectpicker('deselectAll');
            refreshUnultimatedChefSort();
            updateUnultimatedChefDisplayText();
        });
    }
}

/**
 * 刷新未修炼厨师下拉框排序（已选中的优先显示）
 */
var isRefreshingUnultimatedChefSort = false;
function refreshUnultimatedChefSort() {
    if (isRefreshingUnultimatedChefSort) return;
    isRefreshingUnultimatedChefSort = true;
    
    try {
        var $select = $("#select-cal-unultimated-chef");
        var selectedValues = $select.val() || [];
        var selectedSet = {};
        for (var s = 0; s < selectedValues.length; s++) {
            selectedSet[String(selectedValues[s])] = true;
        }
        
        // 获取所有选项
        var options = [];
        $select.find('option').each(function() {
            var $opt = $(this);
            options.push({
                value: $opt.val(),
                text: $opt.text(),
                content: $opt.attr('data-content') || '',
                isSelected: selectedSet[String($opt.val())] === true
            });
        });
        
        // 排序：已选中的优先
        options.sort(function(a, b) {
            if (a.isSelected !== b.isSelected) {
                return a.isSelected ? -1 : 1;
            }
            return 0; // 保持原有顺序
        });
        
        // 清空并重新添加选项
        $select.empty();
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            $select.append('<option value="' + opt.value + '" data-content="' + opt.content.replace(/"/g, '&quot;') + '">' + opt.text + '</option>');
        }
        
        // 刷新selectpicker并恢复选中状态
        $select.selectpicker('refresh');
        if (selectedValues.length > 0) {
            $select.selectpicker('val', selectedValues);
        }
    } finally {
        isRefreshingUnultimatedChefSort = false;
    }
}

// ==================== 主查询函数 ====================

/**
 * 初始化查询按钮事件
 */
function initUnultimatedQueryButton(gameData) {
    $("#btn-unultimated-query").off("click").on("click", function() {
        queryUnultimatedChefs(gameData);
    });
    
    // 选择变化时刷新排序（已选中的优先显示）
    $("#select-cal-unultimated-chef").off("changed.bs.select").on("changed.bs.select", function() {
        refreshUnultimatedChefSort();
    });
}

/**
 * 未修炼厨师修炼任务查询主函数
 */
function queryUnultimatedChefs(gameData) {
    var selectedChefIds = $("#select-cal-unultimated-chef").val();
    if (!selectedChefIds || selectedChefIds.length === 0) {
        return;
    }
    
    // 先清空场上已选
    clearAllSelectedOnField(gameData);
    
    // 1. 获取已勾选的上场类厨师，并分类
    var auraChefs = getEnabledAuraChefsForQuery(gameData);
    
    // 2. 获取选中的未修炼厨师数据
    var targetChefs = [];
    var rule = calCustomRule.rules[0];
    if (!rule || !rule.chefs) {
        return;
    }
    
    // 检查是否勾选了"已配厨具"
    var useEquip = $("#chk-cal-use-equip").prop("checked");
    
    for (var i = 0; i < selectedChefIds.length; i++) {
        var chefId = Number(selectedChefIds[i]);
        var chef = null;
        for (var j = 0; j < rule.chefs.length; j++) {
            if (rule.chefs[j].chefId === chefId) {
                chef = JSON.parse(JSON.stringify(rule.chefs[j])); // 深拷贝，避免修改原数据
                break;
            }
        }
        if (chef) {
            // 保存原始厨具信息
            var originalEquip = chef.equip ? JSON.parse(JSON.stringify(chef.equip)) : null;
            
            // rule.chefs 中的厨师数据不含厨具加成
            // 如果勾选了"已配厨具"，需要加上厨具加成
            if (useEquip && chef.equip && chef.equip.effect) {
                var equipBonus = getEquipSkillBonus(chef.equip);
                chef.stirfryVal = (chef.stirfryVal || chef.stirfry || 0) + equipBonus.stirfry;
                chef.boilVal = (chef.boilVal || chef.boil || 0) + equipBonus.boil;
                chef.knifeVal = (chef.knifeVal || chef.knife || 0) + equipBonus.knife;
                chef.fryVal = (chef.fryVal || chef.fry || 0) + equipBonus.fry;
                chef.bakeVal = (chef.bakeVal || chef.bake || 0) + equipBonus.bake;
                chef.steamVal = (chef.steamVal || chef.steam || 0) + equipBonus.steam;
            }
            var quest = getChefFirstUltimateQuestForQuery(chef, gameData);
            targetChefs.push({
                chef: chef,
                quest: quest,
                originalEquip: originalEquip
            });
        }
    }
    
    if (targetChefs.length === 0) {
        alert("未找到选中的厨师数据");
        return;
    }
    
    // 3. 使用统一策略函数
    var result = queryUnifiedStrategy(gameData, targetChefs, auraChefs);
    
    // 4. 填充结果到UI
    if (result && result.success) {
        fillQueryResultToCalUI(result, gameData);
    } else {
        alert(result ? result.message : "查询失败");
    }
}

// ==================== 光环厨师处理 ====================

/**
 * 从计算器配置页面获取已勾选的上场类厨师，并分类
 * 获取NEXT类和Partial技法加成类厨师
 */
function getEnabledAuraChefsForQuery(gameData) {
    var enabledChefIds = $("#chk-cal-partial-ultimate").val() || [];
    var rule = calCustomRule.rules[0];
    if (!rule || !rule.chefs) return { nextChefs: [], partialChefs: [] };
    
    var nextChefs = [];     // NEXT类厨师
    var partialChefs = [];  // Partial技法加成类厨师
    
    for (var i = 0; i < enabledChefIds.length; i++) {
        var chefId = Number(enabledChefIds[i]);
        var chef = null;
        for (var j = 0; j < rule.chefs.length; j++) {
            if (rule.chefs[j].chefId === chefId) {
                chef = rule.chefs[j];
                break;
            }
        }
        if (!chef || !chef.ultimateSkillEffect) continue;
        
        var chefType = null;
        var skillBonus = { stirfry: 0, boil: 0, knife: 0, fry: 0, bake: 0, steam: 0 };
        var hasSkillBonus = false;
        var conditionType = null;      // 技能条件类型（如 "ChefTag"）
        var conditionValueList = null; // 技能条件值列表（如 [151]）
        
        for (var k = 0; k < chef.ultimateSkillEffect.length; k++) {
            var effect = chef.ultimateSkillEffect[k];
            
            // 跳过时间类技能
            if (effect.type === "OpenTime" || effect.type === "CookbookTime") continue;
            
            if (effect.condition === "Next") {
                chefType = "Next";
                extractSkillBonusForQuery(effect, skillBonus);
                if (isSkillBonusTypeForQuery(effect.type)) hasSkillBonus = true;
                // 保存条件信息
                if (effect.conditionType) conditionType = effect.conditionType;
                if (effect.conditionValueList) conditionValueList = effect.conditionValueList;
            } else if (effect.condition === "Partial") {
                // Partial类只要技法加成类的
                if (isSkillBonusTypeForQuery(effect.type)) {
                    if (chefType !== "Next") chefType = "Partial";
                    extractSkillBonusForQuery(effect, skillBonus);
                    hasSkillBonus = true;
                    // 保存条件信息
                    if (effect.conditionType) conditionType = effect.conditionType;
                    if (effect.conditionValueList) conditionValueList = effect.conditionValueList;
                }
            }
        }
        
        if (chefType === "Next") {
            nextChefs.push({
                chef: chef,
                type: "Next",
                skillBonus: skillBonus,
                totalBonus: getTotalSkillBonusForQuery(skillBonus),
                conditionType: conditionType,
                conditionValueList: conditionValueList
            });
        } else if (chefType === "Partial" && hasSkillBonus) {
            partialChefs.push({
                chef: chef,
                type: "Partial",
                skillBonus: skillBonus,
                totalBonus: getTotalSkillBonusForQuery(skillBonus),
                conditionType: conditionType,
                conditionValueList: conditionValueList
            });
        }
    }
    
    // 按技法加成总值降序排序
    nextChefs.sort(function(a, b) { return b.totalBonus - a.totalBonus; });
    partialChefs.sort(function(a, b) { return b.totalBonus - a.totalBonus; });
    
    return { nextChefs: nextChefs, partialChefs: partialChefs };
}

// ==================== 技法加成处理 ====================

// 技法类型常量
var SKILL_TYPES = ["stirfry", "boil", "knife", "fry", "bake", "steam"];
var SKILL_EFFECT_MAP = {
    "Stirfry": "stirfry", "UseStirfry": "stirfry",
    "Boil": "boil", "UseBoil": "boil",
    "Knife": "knife", "UseKnife": "knife",
    "Fry": "fry", "UseFry": "fry",
    "Bake": "bake", "UseBake": "bake",
    "Steam": "steam", "UseSteam": "steam"
};

/**
 * 获取厨师的技法值
 */
function getChefSkillVal(chef, skill) {
    return chef[skill + "Val"] || chef[skill] || 0;
}

/**
 * 创建空的技法加成对象
 */
function createEmptySkillBonus() {
    return { stirfry: 0, boil: 0, knife: 0, fry: 0, bake: 0, steam: 0 };
}

/**
 * 判断是否为技法加成类型
 */
function isSkillBonusTypeForQuery(type) {
    return SKILL_EFFECT_MAP[type] !== undefined || type === "All_Skill";
}

/**
 * 检查目标厨师是否满足光环厨师的技能条件
 * @param targetChef - 目标厨师（被加成的厨师）
 * @param auraChef - 光环厨师数据（包含conditionType和conditionValueList）
 * @returns {boolean} - 是否满足条件
 */
function checkAuraConditionForQuery(targetChef, auraChef) {
    // 如果没有条件限制，对所有厨师生效
    if (!auraChef.conditionType || !auraChef.conditionValueList) {
        return true;
    }
    
    // 处理 ChefTag 条件类型
    if (auraChef.conditionType === "ChefTag") {
        // 检查目标厨师的tags是否包含条件值列表中的任意一个
        var targetTags = targetChef.tags || [];
        for (var i = 0; i < auraChef.conditionValueList.length; i++) {
            var requiredTag = auraChef.conditionValueList[i];
            if (targetTags.indexOf(requiredTag) >= 0) {
                return true;
            }
        }
        return false;
    }
    
    // 其他条件类型暂时默认通过
    return true;
}

/**
 * 提取技法加成值
 */
function extractSkillBonusForQuery(effect, skillBonus) {
    var value = effect.value || 0;
    var skill = SKILL_EFFECT_MAP[effect.type];
    if (skill) {
        skillBonus[skill] += value;
    } else if (effect.type === "All_Skill") {
        for (var i = 0; i < SKILL_TYPES.length; i++) {
            skillBonus[SKILL_TYPES[i]] += value;
        }
    }
}

/**
 * 获取技法加成总值
 */
function getTotalSkillBonusForQuery(skillBonus) {
    var total = 0;
    for (var i = 0; i < SKILL_TYPES.length; i++) {
        total += skillBonus[SKILL_TYPES[i]];
    }
    return total;
}

/**
 * 获取厨师的第一个修炼任务
 */
function getChefFirstUltimateQuestForQuery(chef, gameData) {
    var originalChef = null;
    for (var i = 0; i < gameData.chefs.length; i++) {
        if (gameData.chefs[i].chefId === chef.chefId) {
            originalChef = gameData.chefs[i];
            break;
        }
    }
    
    if (!originalChef || !originalChef.ultimateGoal || originalChef.ultimateGoal.length === 0) {
        return null;
    }
    
    var questId = originalChef.ultimateGoal[0];
    for (var i = 0; i < gameData.quests.length; i++) {
        if (gameData.quests[i].questId === questId && gameData.quests[i].conditions) {
            return gameData.quests[i];
        }
    }
    return null;
}

// ==================== 厨师技法处理 ====================

/**
 * 应用技法加成到厨师
 */
function applySkillBonusToChef(chef, skillBonus) {
    var boosted = JSON.parse(JSON.stringify(chef));
    for (var i = 0; i < SKILL_TYPES.length; i++) {
        var skill = SKILL_TYPES[i];
        boosted[skill + "Val"] = getChefSkillVal(boosted, skill) + skillBonus[skill];
    }
    return boosted;
}
/**
 * 合并两个技法加成
 */
function combineSkillBonusForQuery(bonus1, bonus2) {
    var result = createEmptySkillBonus();
    for (var i = 0; i < SKILL_TYPES.length; i++) {
        var skill = SKILL_TYPES[i];
        result[skill] = bonus1[skill] + bonus2[skill];
    }
    return result;
}



// ==================== 统一策略函数 ====================

/**
 * 统一策略函数：根据未修炼厨师数量动态分配NEXT/Partial厨师
 * 支持NEXT厨师（只对紧邻的下一个厨师生效）和Partial厨师（对所有厨师生效）
 * 
 * 优化后的策略逻辑（直接顺序评估，避免生成所有方案）：
 * - 1个厨师：顺序尝试 无光环 → NEXT → NEXT+Partial → 2 Partials，达到3神就停止
 * - 2个厨师：两阶段评估，比较哪个厨师放第二位（获得NEXT加成）更优
 * - 3个厨师：无空位放光环厨师，直接评估
 */
function queryUnifiedStrategy(gameData, targetChefs, auraChefs) {
    var rule = calCustomRule.rules[0];
    var chefCount = targetChefs.length;
    var availableAuraSlots = 3 - chefCount;
    var useEquip = $("#chk-cal-use-equip").prop("checked");
    
    /**
     * 获取厨师自身的Partial技法加成（如果是已修炼的Partial厨师且在"上场类已修炼"中勾选）
     */
    function getSelfPartialBonus(chef) {
        var bonus = createEmptySkillBonus();
        if (!chef.ultimateSkillEffect) return null;
        
        // 检查厨师是否在"上场类已修炼"下拉框中被勾选
        var enabledChefIds = $("#chk-cal-partial-ultimate").val() || [];
        var isEnabled = enabledChefIds.indexOf(String(chef.chefId)) >= 0 || 
                        enabledChefIds.indexOf(chef.chefId) >= 0;
        if (!isEnabled) return null;
        
        var hasPartialSkillBonus = false;
        for (var k = 0; k < chef.ultimateSkillEffect.length; k++) {
            var effect = chef.ultimateSkillEffect[k];
            if (effect.condition === "Partial" && isSkillBonusTypeForQuery(effect.type)) {
                // 检查技能条件
                if (effect.conditionType === "ChefTag" && effect.conditionValueList) {
                    var chefTags = chef.tags || [];
                    var meetsCondition = false;
                    for (var c = 0; c < effect.conditionValueList.length; c++) {
                        if (chefTags.indexOf(effect.conditionValueList[c]) >= 0) {
                            meetsCondition = true;
                            break;
                        }
                    }
                    if (!meetsCondition) {
                        continue; // 跳过这个技能效果
                    }
                }
                extractSkillBonusForQuery(effect, bonus);
                hasPartialSkillBonus = true;
            }
        }
        
        return hasPartialSkillBonus ? bonus : null;
    }
    
    /**
     * 移除厨具加成，返回基础厨师
     */
    function removeEquipBonus(chef, equipBonus) {
        var baseChef = JSON.parse(JSON.stringify(chef));
        for (var i = 0; i < SKILL_TYPES.length; i++) {
            var skill = SKILL_TYPES[i];
            baseChef[skill + "Val"] = getChefSkillVal(baseChef, skill) - equipBonus[skill];
        }
        return baseChef;
    }
    
    // 获取所有厨师的数据
    var baseChefs = [];
    for (var i = 0; i < targetChefs.length; i++) {
        var chef = targetChefs[i].chef;
        var originalEquip = targetChefs[i].originalEquip;
        var hasEquip = originalEquip && originalEquip.equipId;
        
        var selfPartialBonus = getSelfPartialBonus(chef);
        var chefForCalc = JSON.parse(JSON.stringify(chef));
        
        if (selfPartialBonus) {
            chefForCalc = applySkillBonusToChef(chefForCalc, selfPartialBonus);
        }
        
        // baseChef 用于厨具推荐计算，需要不含当前厨具加成的基础厨师
        var baseChef;
        if (useEquip && hasEquip) {
            baseChef = removeEquipBonus(chef, getEquipSkillBonus(originalEquip));
        } else {
            baseChef = JSON.parse(JSON.stringify(chef));
        }
        
        baseChefs.push({
            chef: chef,
            chefForCalc: chefForCalc,
            baseChef: baseChef,
            quest: targetChefs[i].quest,
            hasEquip: hasEquip,
            originalEquip: originalEquip,
            selfPartialBonus: selfPartialBonus
        });
    }
    
    var totalRecipeCount = chefCount * 3;
    
    /**
     * 为单个厨师查询菜谱并计算神级数
     * @param chefForCalc - 用于计算的厨师（可能含已佩戴厨具加成）
     * @param quest - 修炼任务
     * @param bonus - 额外的技法加成（NEXT/Partial）
     * @param usedRecipeIds - 已使用的菜谱ID
     */
    function queryOneChefRecipes(chefForCalc, quest, bonus, usedRecipeIds) {
        var boostedChef = bonus ? applySkillBonusToChef(chefForCalc, bonus) : chefForCalc;
        var recipes = queryRecipesForQuestCondition(rule, quest, boostedChef, usedRecipeIds);
        var selectedRecipes = recipes.slice(0, 3);
        
        var godCount = 0;
        var maxDeficitBySkill = createEmptySkillBonus();
        
        for (var j = 0; j < selectedRecipes.length; j++) {
            var diff = calculateSkillDiffForQuery(boostedChef, selectedRecipes[j], 4);
            if (diff.value === 0) {
                godCount++;
            } else {
                var detailedDiff = calculateDetailedSkillDiffForQuery(boostedChef, selectedRecipes[j], 4);
                for (var k = 0; k < SKILL_TYPES.length; k++) {
                    var skill = SKILL_TYPES[k];
                    if (detailedDiff[skill] < 0) {
                        maxDeficitBySkill[skill] = Math.max(maxDeficitBySkill[skill], Math.abs(detailedDiff[skill]));
                    }
                }
            }
        }
        
        var totalDiff = getTotalSkillBonusForQuery(maxDeficitBySkill);
        
        // 判断是否可通过厨具补救
        var useStrongEquip = $("#chk-unultimated-use-strong-equip").prop("checked");
        var equipMaxBonus = useStrongEquip ? 999 : 100;
        var canBeFixed = true;
        for (var k = 0; k < SKILL_TYPES.length; k++) {
            if (maxDeficitBySkill[SKILL_TYPES[k]] > equipMaxBonus) {
                canBeFixed = false;
                break;
            }
        }
        
        return {
            recipes: selectedRecipes,
            godCount: godCount,
            totalDiff: totalDiff,
            canBeFixed: canBeFixed
        };
    }
    
    // ========== 优先判断：不使用光环厨师能否直接全部达神 ==========
    var noAuraUsedRecipeIds = [];
    var noAuraResults = [];
    var noAuraTotalGodCount = 0;
    var allChefsCanReachFullGod = true;
    
    for (var i = 0; i < baseChefs.length; i++) {
        var data = baseChefs[i];
        var result = queryOneChefRecipes(data.chefForCalc, data.quest, null, noAuraUsedRecipeIds);
        
        for (var j = 0; j < result.recipes.length; j++) {
            noAuraUsedRecipeIds.push(result.recipes[j].recipeId);
        }
        
        noAuraTotalGodCount += result.godCount;
        noAuraResults.push({
            chef: data.chef,
            chefForCalc: data.chefForCalc,
            baseChef: data.baseChef,
            recipes: result.recipes,
            godCount: result.godCount,
            bonus: null,
            hasEquip: data.hasEquip,
            originalEquip: data.originalEquip
        });
        
        if (result.godCount < 3) {
            allChefsCanReachFullGod = false;
        }
    }
    
    // 如果所有厨师都能直接达到3道神级，直接返回
    if (allChefsCanReachFullGod) {
        var positions = [];
        for (var i = 0; i < noAuraResults.length; i++) {
            positions.push({
                type: "target",
                chef: noAuraResults[i].chef,
                recipes: noAuraResults[i].recipes,
                recommendedEquip: null
            });
        }
        while (positions.length < 3) {
            positions.push({ type: "empty" });
        }
        
        return {
            success: true,
            positions: positions,
            message: "无需光环厨师（" + totalRecipeCount + "/" + totalRecipeCount + "达神）"
        };
    }
    
    // ========== 根据厨师数量选择不同策略 ==========
    
    /**
     * 评估一个方案（基础评估，不计算厨具补充）
     * @param scheme - 方案配置 { positions: [{type, auraChef?, targetIndex?}], description }
     */
    function evaluateScheme(scheme) {
        var results = [];
        var usedRecipeIds = [];
        var totalGodCount = 0;
        var totalDiff = 0;
        
        // 计算每个目标厨师获得的加成
        var targetBonuses = [];
        for (var i = 0; i < baseChefs.length; i++) {
            targetBonuses[i] = createEmptySkillBonus();
        }
        
        // 遍历方案中的位置，计算加成
        var nextChefBonus = null;
        var nextChefTargetIndex = -1;
        var nextAuraChef = null;
        
        for (var p = 0; p < scheme.positions.length; p++) {
            var pos = scheme.positions[p];
            
            if (pos.type === "next" && pos.auraChef) {
                nextChefBonus = pos.auraChef.skillBonus;
                nextAuraChef = pos.auraChef;
                // 找到下一个目标厨师的索引
                for (var np = p + 1; np < scheme.positions.length; np++) {
                    if (scheme.positions[np].type === "target") {
                        nextChefTargetIndex = scheme.positions[np].targetIndex;
                        break;
                    }
                }
            } else if (pos.type === "partial" && pos.auraChef) {
                // Partial厨师加成给满足条件的目标厨师
                for (var t = 0; t < targetBonuses.length; t++) {
                    // 检查目标厨师是否满足光环厨师的技能条件
                    if (checkAuraConditionForQuery(baseChefs[t].chef, pos.auraChef)) {
                        targetBonuses[t] = combineSkillBonusForQuery(targetBonuses[t], pos.auraChef.skillBonus);
                    }
                }
            }
        }
        
        // 如果有NEXT厨师，将加成应用到目标厨师（需要检查条件）
        if (nextChefBonus && nextChefTargetIndex >= 0 && nextAuraChef) {
            // 检查目标厨师是否满足NEXT光环厨师的技能条件
            if (checkAuraConditionForQuery(baseChefs[nextChefTargetIndex].chef, nextAuraChef)) {
                targetBonuses[nextChefTargetIndex] = combineSkillBonusForQuery(
                    targetBonuses[nextChefTargetIndex], nextChefBonus
                );
            }
        }
        
        // 按方案中目标厨师的顺序查询菜谱
        var targetOrder = [];
        for (var p = 0; p < scheme.positions.length; p++) {
            if (scheme.positions[p].type === "target") {
                targetOrder.push(scheme.positions[p].targetIndex);
            }
        }
        
        // 为每个目标厨师查询菜谱（使用chefForCalc，含已佩戴厨具加成）
        var allCanBeFixed = true;
        for (var i = 0; i < targetOrder.length; i++) {
            var targetIdx = targetOrder[i];
            var data = baseChefs[targetIdx];
            var bonus = targetBonuses[targetIdx];
            
            // 使用 chefForCalc（含已佩戴厨具加成）进行计算
            var result = queryOneChefRecipes(data.chefForCalc, data.quest, bonus, usedRecipeIds);
            
            // 记录已使用的菜谱
            for (var j = 0; j < result.recipes.length; j++) {
                usedRecipeIds.push(result.recipes[j].recipeId);
            }
            
            totalGodCount += result.godCount;
            totalDiff += result.totalDiff;
            if (!result.canBeFixed) allCanBeFixed = false;
            
            results[targetIdx] = {
                chef: data.chef,
                chefForCalc: data.chefForCalc,
                baseChef: data.baseChef,
                recipes: result.recipes,
                godCount: result.godCount,
                bonus: bonus,
                hasEquip: data.hasEquip,
                originalEquip: data.originalEquip,
                canBeFixed: result.canBeFixed
            };
        }
        
        return {
            results: results,
            totalGodCount: totalGodCount,
            totalDiff: totalDiff,
            canBeFixed: allCanBeFixed,
            positions: scheme.positions
        };
    }
    
    /**
     * 计算方案的潜在神级数（厨具补充后）
     * 只在需要时调用，避免每个方案都计算
     */
    function calculatePotentialGodCount(evalResult) {
        var potentialGodCount = 0;
        for (var i = 0; i < evalResult.results.length; i++) {
            var r = evalResult.results[i];
            if (!r) continue;
            
            var chefPotentialGodCount = r.godCount;
            if (r.godCount < 3) {
                var equipResult = tryFindEquipForNotGodRecipes(r.baseChef, r.recipes, r.bonus, gameData);
                if (equipResult && equipResult.equip) {
                    var newGodCount = 3 - (equipResult.totalNotGod - equipResult.satisfiedCount);
                    if (newGodCount > r.godCount) {
                        chefPotentialGodCount = newGodCount;
                    }
                }
            }
            potentialGodCount += chefPotentialGodCount;
        }
        return potentialGodCount;
    }
    
    if (chefCount === 3) {
        // 3个厨师，没有空位放光环厨师，直接返回无光环结果
        var positions = [];
        var recommendedEquips = {};
        var finalGodCount = noAuraTotalGodCount;
        
        // 厨具补充
        for (var i = 0; i < noAuraResults.length; i++) {
            var r = noAuraResults[i];
            if (r.godCount < 3) {
                var equipResult = tryFindEquipForNotGodRecipes(r.baseChef, r.recipes, null, gameData);
                if (equipResult && equipResult.equip) {
                    var newGodCount = 3 - (equipResult.totalNotGod - equipResult.satisfiedCount);
                    if (newGodCount > r.godCount) {
                        recommendedEquips[i] = equipResult.equip;
                        finalGodCount += (newGodCount - r.godCount);
                    }
                }
            }
            positions.push({
                type: "target",
                chef: r.chef,
                recipes: r.recipes,
                recommendedEquip: recommendedEquips[i] || null
            });
        }
        
        return {
            success: true,
            positions: positions,
            message: "无光环厨师（" + finalGodCount + "/" + totalRecipeCount + "达神）"
        };
        
    } else if (chefCount === 1) {
        // 1个厨师，2个空位 - 评估所有光环组合，选择最优
        // 优先级：达神数 > 可补救性 > 差值
        var data = baseChefs[0];
        var bestEvalResult = null;
        var bestSchemeDesc = "无光环厨师";
        var bestCanBeFixed = false;
        
        /**
         * 比较两个结果，判断新结果是否更优
         * 优先级：达神数 > 可补救性 > 差值
         */
        function isBetterResult(newResult, oldGodCount, oldCanBeFixed, oldDiff) {
            // 1. 达神数更高
            if (newResult.godCount > oldGodCount) return true;
            if (newResult.godCount < oldGodCount) return false;
            // 2. 达神数相同，可补救优先
            if (newResult.canBeFixed && !oldCanBeFixed) return true;
            if (!newResult.canBeFixed && oldCanBeFixed) return false;
            // 3. 可补救性相同，差值更低
            return newResult.totalDiff < oldDiff;
        }
        
        // 使用第二步已计算的无光环结果作为基准（避免重复计算）
        var noAuraResultForChef = noAuraResults[0];
        // 重新计算无光环的详细信息（包含canBeFixed）
        var noAuraDetailResult = queryOneChefRecipes(data.chefForCalc, data.quest, null, []);
        
        bestEvalResult = {
            results: [{
                chef: noAuraResultForChef.chef,
                chefForCalc: noAuraResultForChef.chefForCalc,
                baseChef: noAuraResultForChef.baseChef,
                recipes: noAuraResultForChef.recipes,
                godCount: noAuraResultForChef.godCount,
                bonus: null,
                hasEquip: noAuraResultForChef.hasEquip,
                originalEquip: noAuraResultForChef.originalEquip
            }],
            totalGodCount: noAuraResultForChef.godCount,
            totalDiff: noAuraDetailResult.totalDiff,
            positions: [{ type: "target", targetIndex: 0 }, { type: "empty" }, { type: "empty" }]
        };
        bestCanBeFixed = noAuraDetailResult.canBeFixed;
        
        // 如果无光环已达3神，跳过后续评估（第二步已判断，这里是双重保险）
        if (bestEvalResult.totalGodCount < 3) {
            // 遍历有光环组合
            
            // 1. 尝试单个NEXT厨师
            for (var n = 0; n < auraChefs.nextChefs.length; n++) {
                var nextChef = auraChefs.nextChefs[n];
                if (!checkAuraConditionForQuery(data.chef, nextChef)) continue;
                
                var result = queryOneChefRecipes(data.chefForCalc, data.quest, nextChef.skillBonus, []);
                if (isBetterResult(result, bestEvalResult.totalGodCount, bestCanBeFixed, bestEvalResult.totalDiff)) {
                    bestEvalResult = {
                        results: [{
                            chef: data.chef, chefForCalc: data.chefForCalc, baseChef: data.baseChef,
                            recipes: result.recipes, godCount: result.godCount, bonus: nextChef.skillBonus,
                            hasEquip: data.hasEquip, originalEquip: data.originalEquip
                        }],
                        totalGodCount: result.godCount,
                        totalDiff: result.totalDiff,
                        positions: [
                            { type: "next", auraChef: nextChef },
                            { type: "target", targetIndex: 0 },
                            { type: "empty" }
                        ]
                    };
                    bestCanBeFixed = result.canBeFixed;
                    bestSchemeDesc = "NEXT(" + nextChef.chef.name + ")";
                }
            }
            
            // 2. 尝试NEXT + Partial组合
            for (var n = 0; n < auraChefs.nextChefs.length; n++) {
                var nextChef = auraChefs.nextChefs[n];
                if (!checkAuraConditionForQuery(data.chef, nextChef)) continue;
                
                for (var p = 0; p < auraChefs.partialChefs.length; p++) {
                    var partialChef = auraChefs.partialChefs[p];
                    if (!checkAuraConditionForQuery(data.chef, partialChef)) continue;
                    
                    var combinedBonus = combineSkillBonusForQuery(nextChef.skillBonus, partialChef.skillBonus);
                    var result = queryOneChefRecipes(data.chefForCalc, data.quest, combinedBonus, []);
                    if (isBetterResult(result, bestEvalResult.totalGodCount, bestCanBeFixed, bestEvalResult.totalDiff)) {
                        bestEvalResult = {
                            results: [{
                                chef: data.chef, chefForCalc: data.chefForCalc, baseChef: data.baseChef,
                                recipes: result.recipes, godCount: result.godCount, bonus: combinedBonus,
                                hasEquip: data.hasEquip, originalEquip: data.originalEquip
                            }],
                            totalGodCount: result.godCount,
                            totalDiff: result.totalDiff,
                            positions: [
                                { type: "next", auraChef: nextChef },
                                { type: "target", targetIndex: 0 },
                                { type: "partial", auraChef: partialChef }
                            ]
                        };
                        bestCanBeFixed = result.canBeFixed;
                        bestSchemeDesc = "NEXT(" + nextChef.chef.name + ") + Partial(" + partialChef.chef.name + ")";
                    }
                }
            }
            
            // 3. 尝试2个Partial厨师
            for (var p1 = 0; p1 < auraChefs.partialChefs.length; p1++) {
                var partial1 = auraChefs.partialChefs[p1];
                if (!checkAuraConditionForQuery(data.chef, partial1)) continue;
                
                for (var p2 = p1 + 1; p2 < auraChefs.partialChefs.length; p2++) {
                    var partial2 = auraChefs.partialChefs[p2];
                    if (!checkAuraConditionForQuery(data.chef, partial2)) continue;
                    
                    var combinedBonus = combineSkillBonusForQuery(partial1.skillBonus, partial2.skillBonus);
                    var result = queryOneChefRecipes(data.chefForCalc, data.quest, combinedBonus, []);
                    if (isBetterResult(result, bestEvalResult.totalGodCount, bestCanBeFixed, bestEvalResult.totalDiff)) {
                        bestEvalResult = {
                            results: [{
                                chef: data.chef, chefForCalc: data.chefForCalc, baseChef: data.baseChef,
                                recipes: result.recipes, godCount: result.godCount, bonus: combinedBonus,
                                hasEquip: data.hasEquip, originalEquip: data.originalEquip
                            }],
                            totalGodCount: result.godCount,
                            totalDiff: result.totalDiff,
                            positions: [
                                { type: "partial", auraChef: partial1 },
                                { type: "partial", auraChef: partial2 },
                                { type: "target", targetIndex: 0 }
                            ]
                        };
                        bestCanBeFixed = result.canBeFixed;
                        bestSchemeDesc = "Partial(" + partial1.chef.name + " + " + partial2.chef.name + ")";
                    }
                }
            }
        }
        
        // 厨具补充
        var recommendedEquip = null;
        var finalGodCount = bestEvalResult.totalGodCount;
        if (bestEvalResult.totalGodCount < 3 && bestEvalResult.results[0]) {
            var r = bestEvalResult.results[0];
            var equipResult = tryFindEquipForNotGodRecipes(r.baseChef, r.recipes, r.bonus, gameData);
            if (equipResult && equipResult.equip) {
                var newGodCount = 3 - (equipResult.totalNotGod - equipResult.satisfiedCount);
                if (newGodCount > r.godCount) {
                    recommendedEquip = equipResult.equip;
                    finalGodCount = newGodCount;
                }
            }
        }
        
        // 构建返回结果
        var positions = [];
        for (var p = 0; p < bestEvalResult.positions.length; p++) {
            var pos = bestEvalResult.positions[p];
            if (pos.type === "next" && pos.auraChef) {
                positions.push({ type: "aura", chef: pos.auraChef.chef, auraType: "next" });
            } else if (pos.type === "partial" && pos.auraChef) {
                positions.push({ type: "aura", chef: pos.auraChef.chef, auraType: "partial" });
            } else if (pos.type === "target") {
                positions.push({
                    type: "target",
                    chef: bestEvalResult.results[0].chef,
                    recipes: bestEvalResult.results[0].recipes,
                    recommendedEquip: recommendedEquip
                });
            } else if (pos.type === "empty") {
                positions.push({ type: "empty" });
            }
        }
        while (positions.length < 3) {
            positions.push({ type: "empty" });
        }
        
        return {
            success: bestEvalResult.results[0] && bestEvalResult.results[0].recipes.length >= 3,
            positions: positions,
            message: bestSchemeDesc + "（" + finalGodCount + "/3达神）"
        };
        
    } else if (chefCount === 2) {
        // 2个厨师，1个空位 - 使用两阶段评估（需要比较哪个厨师放第二位更优）
        
        // 使用第二步已计算的无光环结果作为基准
        var noAuraScheme = {
            positions: [
                { type: "target", targetIndex: 0 },
                { type: "target", targetIndex: 1 },
                { type: "empty" }
            ],
            description: "无光环厨师"
        };
        
        // 计算无光环结果的canBeFixed（需要重新评估以获取详细信息）
        var noAuraEvalResult = evaluateScheme(noAuraScheme);
        
        // 生成有光环的方案（不包含无光环方案，因为第二步已经计算过）
        var allSchemes = [];
        
        // 方案1：NEXT + 厨师A + 厨师B（NEXT给厨师A加成）
        for (var n = 0; n < auraChefs.nextChefs.length; n++) {
            allSchemes.push({
                positions: [
                    { type: "next", auraChef: auraChefs.nextChefs[n] },
                    { type: "target", targetIndex: 0 },
                    { type: "target", targetIndex: 1 }
                ],
                description: "NEXT(" + auraChefs.nextChefs[n].chef.name + ") -> " + baseChefs[0].chef.name
            });
        }
        
        // 方案2：NEXT + 厨师B + 厨师A（NEXT给厨师B加成）
        for (var n = 0; n < auraChefs.nextChefs.length; n++) {
            allSchemes.push({
                positions: [
                    { type: "next", auraChef: auraChefs.nextChefs[n] },
                    { type: "target", targetIndex: 1 },
                    { type: "target", targetIndex: 0 }
                ],
                description: "NEXT(" + auraChefs.nextChefs[n].chef.name + ") -> " + baseChefs[1].chef.name
            });
        }
        
        // 方案3：Partial + 厨师A + 厨师B
        for (var p = 0; p < auraChefs.partialChefs.length; p++) {
            allSchemes.push({
                positions: [
                    { type: "partial", auraChef: auraChefs.partialChefs[p] },
                    { type: "target", targetIndex: 0 },
                    { type: "target", targetIndex: 1 }
                ],
                description: "Partial(" + auraChefs.partialChefs[p].chef.name + ")"
            });
        }
        
        // 将无光环结果作为初始最优方案
        var bestScheme = noAuraScheme;
        var bestResult = noAuraEvalResult;
        var maxGodCount = noAuraEvalResult.totalGodCount;
        var bestCanBeFixed = noAuraEvalResult.canBeFixed;
        
        // 第一阶段：评估所有有光环方案，与无光环基准比较
        var candidateSchemes = [{ scheme: noAuraScheme, evalResult: noAuraEvalResult }];
        
        for (var s = 0; s < allSchemes.length; s++) {
            var scheme = allSchemes[s];
            var evalResult = evaluateScheme(scheme);
            
            // 比较优先级：达神数 > 可补救性
            var dominated = false;
            var dominated_by = [];
            
            for (var c = 0; c < candidateSchemes.length; c++) {
                var existing = candidateSchemes[c].evalResult;
                // 如果现有方案达神数更高，或达神数相同但可补救性更好
                if (existing.totalGodCount > evalResult.totalGodCount) {
                    dominated = true;
                    break;
                }
                if (existing.totalGodCount === evalResult.totalGodCount && 
                    existing.canBeFixed && !evalResult.canBeFixed) {
                    dominated = true;
                    break;
                }
                // 如果新方案更优，标记现有方案被淘汰
                if (evalResult.totalGodCount > existing.totalGodCount ||
                    (evalResult.totalGodCount === existing.totalGodCount && 
                     evalResult.canBeFixed && !existing.canBeFixed)) {
                    dominated_by.push(c);
                }
            }
            
            if (!dominated) {
                // 移除被新方案淘汰的方案
                for (var d = dominated_by.length - 1; d >= 0; d--) {
                    candidateSchemes.splice(dominated_by[d], 1);
                }
                candidateSchemes.push({ scheme: scheme, evalResult: evalResult });
                if (evalResult.totalGodCount > maxGodCount) {
                    maxGodCount = evalResult.totalGodCount;
                }
            }
        }
        
        // 过滤候选方案：只保留达神数最高且可补救性最好的
        var bestCanBeFixed = false;
        for (var c = 0; c < candidateSchemes.length; c++) {
            if (candidateSchemes[c].evalResult.totalGodCount === maxGodCount && 
                candidateSchemes[c].evalResult.canBeFixed) {
                bestCanBeFixed = true;
                break;
            }
        }
        candidateSchemes = candidateSchemes.filter(function(c) {
            return c.evalResult.totalGodCount === maxGodCount &&
                   (c.evalResult.canBeFixed === bestCanBeFixed || !bestCanBeFixed);
        });
        
        // 第二阶段：如果有多个候选方案且未达到全神，计算潜在神级数
        var bestPotentialGodCount = -1;
        var bestTotalDiff = Infinity;
        
        if (candidateSchemes.length === 1) {
            bestScheme = candidateSchemes[0].scheme;
            bestResult = candidateSchemes[0].evalResult;
        } else if (candidateSchemes.length > 1) {
            if (maxGodCount < totalRecipeCount) {
                // 未达到全神，计算潜在神级数
                for (var c = 0; c < candidateSchemes.length; c++) {
                    var candidate = candidateSchemes[c];
                    var potentialGodCount = calculatePotentialGodCount(candidate.evalResult);
                    
                    var isBetter = false;
                    if (potentialGodCount > bestPotentialGodCount) {
                        isBetter = true;
                    } else if (potentialGodCount === bestPotentialGodCount && candidate.evalResult.totalDiff < bestTotalDiff) {
                        isBetter = true;
                    }
                    
                    if (isBetter) {
                        bestScheme = candidate.scheme;
                        bestResult = candidate.evalResult;
                        bestPotentialGodCount = potentialGodCount;
                        bestTotalDiff = candidate.evalResult.totalDiff;
                    }
                }
            } else {
                // 已达到全神，按总差值选择
                for (var c = 0; c < candidateSchemes.length; c++) {
                    var candidate = candidateSchemes[c];
                    if (candidate.evalResult.totalDiff < bestTotalDiff) {
                        bestScheme = candidate.scheme;
                        bestResult = candidate.evalResult;
                        bestTotalDiff = candidate.evalResult.totalDiff;
                    }
                }
            }
        }
        
        // 厨具补充
        var recommendedEquips = {};
        var finalGodCount = maxGodCount;
        
        if (maxGodCount < totalRecipeCount && bestResult) {
            for (var i = 0; i < bestResult.results.length; i++) {
                var r = bestResult.results[i];
                if (r && r.godCount < 3) {
                    var equipResult = tryFindEquipForNotGodRecipes(r.baseChef, r.recipes, r.bonus, gameData);
                    if (equipResult && equipResult.equip) {
                        var newGodCount = 3 - (equipResult.totalNotGod - equipResult.satisfiedCount);
                        if (newGodCount > r.godCount) {
                            recommendedEquips[i] = equipResult.equip;
                            finalGodCount += (newGodCount - r.godCount);
                        }
                    }
                }
            }
        }
        
        // 构建返回结果
        var positions = [];
        
        if (bestResult && bestResult.positions) {
            for (var p = 0; p < bestResult.positions.length; p++) {
                var pos = bestResult.positions[p];
                
                if (pos.type === "next" && pos.auraChef) {
                    positions.push({ type: "aura", chef: pos.auraChef.chef, auraType: "next" });
                } else if (pos.type === "partial" && pos.auraChef) {
                    positions.push({ type: "aura", chef: pos.auraChef.chef, auraType: "partial" });
                } else if (pos.type === "target") {
                    var targetIdx = pos.targetIndex;
                    var r = bestResult.results[targetIdx];
                    positions.push({
                        type: "target",
                        chef: r.chef,
                        recipes: r.recipes,
                        recommendedEquip: recommendedEquips[targetIdx] || null
                    });
                } else if (pos.type === "empty") {
                    positions.push({ type: "empty" });
                }
            }
        }
        
        while (positions.length < 3) {
            positions.push({ type: "empty" });
        }
        
        var message = bestScheme ? bestScheme.description : "无光环厨师";
        message += "（" + finalGodCount + "/" + totalRecipeCount + "达神）";
        
        return {
            success: bestResult ? bestResult.results.every(function(r) { return r && r.recipes.length >= 3; }) : false,
            positions: positions,
            message: message
        };
    }
    
    // 默认返回（不应该到达这里）
    return {
        success: false,
        positions: [],
        message: "未知错误"
    };
}


// ==================== 菜谱查询和匹配 ====================

/**
 * 查询满足修炼任务条件的菜谱
 */
function queryRecipesForQuestCondition(rule, quest, chef, usedRecipeIds) {
    if (!quest || !quest.conditions || quest.conditions.length === 0) {
        return [];
    }
    
    var filteredRecipes = [];
    var menus = rule.menus || [];
    
    var needGodRank = false;
    for (var c in quest.conditions) {
        if (quest.conditions[c].rank === 4) {
            needGodRank = true;
            break;
        }
    }
    
    for (var i = 0; i < menus.length; i++) {
        var recipe = menus[i].recipe.data;
        if (!recipe) continue;
        
        if (usedRecipeIds.indexOf(recipe.recipeId) >= 0) continue;
        if ($("#chk-cal-got").prop("checked") && !recipe.got) continue;
        if (!checkRecipeMatchQuestConditions(recipe, quest)) continue;
        
        var skillDiffResult = calculateSkillDiffForQuery(chef, recipe, 4);
        
        filteredRecipes.push({
            recipe: recipe,
            recipeId: recipe.recipeId,
            canReachGod: skillDiffResult.value === 0,
            skillDiff: skillDiffResult.value,
            time: recipe.time
        });
    }
    
    if (needGodRank) {
        filteredRecipes.sort(function(a, b) {
            if (a.canReachGod !== b.canReachGod) {
                return a.canReachGod ? -1 : 1;
            }
            if (a.skillDiff !== b.skillDiff) {
                return a.skillDiff - b.skillDiff;
            }
            return a.time - b.time;
        });
    } else {
        filteredRecipes.sort(function(a, b) {
            return a.time - b.time;
        });
    }
    
    return filteredRecipes.map(function(r) { return r.recipe; });
}

/**
 * 检查菜谱是否满足修炼任务条件
 */
function checkRecipeMatchQuestConditions(recipe, quest) {
    if (!quest || !quest.conditions || quest.conditions.length === 0) {
        return false;
    }
    
    var conditions = quest.conditions;
    var matched = false;
    
    for (var o in conditions) {
        var p = true;
        var r = conditions[o];
        
        if (r.recipeId && r.recipeId != recipe.recipeId) p = false;
        
        if (p && r.materialId) {
            var hasMaterial = false;
            for (var u in recipe.materials) {
                if (recipe.materials[u].material == r.materialId) {
                    hasMaterial = true;
                    break;
                }
            }
            if (!hasMaterial) p = false;
        }
        
        if (p && r.guest) {
            if (recipe.guestsVal && recipe.guestsVal.indexOf(r.guest) >= 0) {
            } else if (recipe.rankGuestsVal && recipe.rankGuestsVal.indexOf(r.guest) >= 0) {
            } else {
                p = false;
            }
        }
        
        if (p && (r.anyGuest || r.newGuest)) {
            if (!recipe.guestsVal && !recipe.rankGuestsVal) p = false;
        }
        
        if (p && r.skill && recipe["" + r.skill] == 0) p = false;
        if (p && r.rarity && recipe.rarity < r.rarity) p = false;
        if (p && r.price && recipe.price < r.price) p = false;
        if (p && r.category && !recipe["" + r.category]) p = false;
        if (p && r.condiment && recipe.condiment != r.condiment) p = false;
        
        if (p) {
            matched = true;
            break;
        }
    }
    
    return matched;
}

// ==================== 技法差值计算 ====================

/**
 * 计算厨师做菜谱的详细技法差值（同时返回总差值和各技法差值）
 */
function calculateSkillDiffForQuery(chef, recipe, targetRank, returnDetailed) {
    var totalDiff = 0;
    var detailed = createEmptySkillBonus();
    
    for (var i = 0; i < SKILL_TYPES.length; i++) {
        var skill = SKILL_TYPES[i];
        var recipeNeed = recipe[skill] || 0;
        if (recipeNeed > 0) {
            var diff = getChefSkillVal(chef, skill) - recipeNeed * targetRank;
            detailed[skill] = diff;
            if (diff < 0) totalDiff += Math.abs(diff);
        }
    }
    
    if (returnDetailed) {
        return detailed;
    }
    return { value: totalDiff };
}

/**
 * 计算厨师做菜谱的详细技法差值（兼容旧调用）
 */
function calculateDetailedSkillDiffForQuery(chef, recipe, targetRank) {
    return calculateSkillDiffForQuery(chef, recipe, targetRank, true);
}

// ==================== UI填充 ====================

/**
 * 将查询结果填充到计算器UI
 */
function fillQueryResultToCalUI(result, gameData) {
    var rule = calCustomRule.rules[0];
    var custom = rule.custom;
    
    var savedEquips = [];
    for (var i = 0; i < 3; i++) {
        if (custom[i] && custom[i].equip && custom[i].equip.equipId) {
            savedEquips[i] = custom[i].equip.equipId;
        } else {
            savedEquips[i] = null;
        }
    }
    
    for (var i = 0; i < 3; i++) {
        setCustomChef(0, i, null);
        for (var j = 0; j < 3; j++) {
            setCustomRecipe(0, i, j, null);
        }
    }
    
    for (var i = 0; i < result.positions.length; i++) {
        var pos = result.positions[i];
        
        if (pos.type === "empty") continue;
        
        setCustomChef(0, i, pos.chef.chefId);
        
        if (savedEquips[i]) {
            setCustomEquip(0, i, savedEquips[i]);
        }
        
        if (pos.recipes) {
            for (var j = 0; j < pos.recipes.length && j < 3; j++) {
                setCustomRecipe(0, i, j, pos.recipes[j].recipeId);
            }
        }
        
        if (pos.recommendedEquip) {
            setCustomEquip(0, i, pos.recommendedEquip.equipId);
        }
    }
    
    calCustomResults(gameData);
    
    for (var i = 0; i < result.positions.length; i++) {
        var pos = result.positions[i];
        if (pos.type === "empty" || !pos.recipes || pos.recipes.length <= 1) continue;
        
        var recipesWithRank = [];
        for (var j = 0; j < custom[i].recipes.length; j++) {
            var recipeData = custom[i].recipes[j];
            if (recipeData && recipeData.data) {
                recipesWithRank.push({
                    recipeId: recipeData.data.recipeId,
                    rankVal: recipeData.rankVal || 0,
                    skillDiff: recipeData.skillDiff || 0
                });
            }
        }
        
        recipesWithRank.sort(function(a, b) {
            if (b.rankVal !== a.rankVal) {
                return b.rankVal - a.rankVal;
            }
            return b.skillDiff - a.skillDiff;
        });
        
        var needReorder = false;
        for (var j = 0; j < recipesWithRank.length; j++) {
            if (custom[i].recipes[j] && custom[i].recipes[j].data && 
                custom[i].recipes[j].data.recipeId !== recipesWithRank[j].recipeId) {
                needReorder = true;
                break;
            }
        }
        
        if (needReorder) {
            for (var j = 0; j < 3; j++) {
                setCustomRecipe(0, i, j, null);
            }
            for (var j = 0; j < recipesWithRank.length; j++) {
                setCustomRecipe(0, i, j, recipesWithRank[j].recipeId);
            }
        }
    }
    
    calCustomResults(gameData);
}


// ==================== 厨具相关 ====================

/**
 * 获取厨具的技法加成类型和值
 */
function getEquipSkillBonus(equip) {
    var bonus = createEmptySkillBonus();
    if (!equip || !equip.effect) return bonus;
    
    for (var i = 0; i < equip.effect.length; i++) {
        var effect = equip.effect[i];
        if (effect.condition && effect.condition !== "Self") continue;
        
        var skill = SKILL_EFFECT_MAP[effect.type];
        if (skill) {
            bonus[skill] += effect.value || 0;
        }
    }
    return bonus;
}

/**
 * 获取厨具的最大技法加成值
 */
function getEquipMaxSkillValue(equip) {
    var bonus = getEquipSkillBonus(equip);
    var max = 0;
    for (var i = 0; i < SKILL_TYPES.length; i++) {
        if (bonus[SKILL_TYPES[i]] > max) max = bonus[SKILL_TYPES[i]];
    }
    return max;
}

/**
 * 获取厨具来源优先级（数字越小优先级越高）
 * 优先级：新手奖池(1) > 实验室(2) > 碧池(3) > 其他(4)
 */
function getEquipOriginPriority(origin) {
    if (!origin) return 4;
    if (origin.indexOf("新手奖池") >= 0) return 1;
    if (origin.indexOf("实验室") >= 0) return 2;
    if (origin.indexOf("碧池") >= 0) return 3;
    return 4;
}

/**
 * 检查厨具是否能使菜谱达到神级
 */
function canEquipMakeRecipeGod(chef, recipe, equipBonus, auraBonus) {
    var totalBonus = auraBonus ? combineSkillBonusForQuery(equipBonus, auraBonus) : equipBonus;
    var boostedChef = applySkillBonusToChef(chef, totalBonus);
    return calculateSkillDiffForQuery(boostedChef, recipe, 4).value === 0;
}

/**
 * 查找能使未达神菜谱达到神级的厨具
 * 排序优先级：来源优先级 > 同来源按厨具ID降序（优先使用新厨具）> 技法加成值升序
 */
function findEquipForNotGodRecipes(baseChef, recipes, notGodIndices, auraBonus, allEquips, useStrongEquip) {
    if (notGodIndices.length === 0) return null;
    
    var candidateEquips = [];
    for (var i = 0; i < allEquips.length; i++) {
        var equip = allEquips[i];
        var bonus = getEquipSkillBonus(equip);
        var maxValue = getEquipMaxSkillValue(equip);
        
        if (maxValue === 0) continue;
        if (!useStrongEquip && maxValue > 100) continue;
        
        candidateEquips.push({
            equip: equip,
            bonus: bonus,
            maxValue: maxValue,
            originPriority: getEquipOriginPriority(equip.origin),
            equipId: equip.equipId || 0
        });
    }
    
    // 排序：来源优先级 > 同来源按厨具ID降序 > 技法加成值升序
    candidateEquips.sort(function(a, b) {
        // 1. 来源优先级
        if (a.originPriority !== b.originPriority) {
            return a.originPriority - b.originPriority;
        }
        // 2. 同来源按厨具ID降序（优先使用新厨具）
        if (a.equipId !== b.equipId) {
            return b.equipId - a.equipId;
        }
        // 3. 技法加成值升序（用最小够用的）
        return a.maxValue - b.maxValue;
    });
    
    for (var targetCount = notGodIndices.length; targetCount >= 1; targetCount--) {
        for (var i = 0; i < candidateEquips.length; i++) {
            var candidate = candidateEquips[i];
            var satisfiedCount = 0;
            
            for (var j = 0; j < notGodIndices.length; j++) {
                if (canEquipMakeRecipeGod(baseChef, recipes[notGodIndices[j]], candidate.bonus, auraBonus)) {
                    satisfiedCount++;
                }
            }
            
            if (satisfiedCount >= targetCount) {
                return {
                    equip: candidate.equip,
                    satisfiedCount: satisfiedCount,
                    totalNotGod: notGodIndices.length
                };
            }
        }
    }
    
    return null;
}

/**
 * 尝试为未达神的菜谱找厨具补足
 * @param baseChef - 基础厨师（不含厨具加成）
 * @param recipes - 选中的菜谱
 * @param auraBonus - 光环厨师的技法加成（可选）
 * @param gameData - 游戏数据
 */
function tryFindEquipForNotGodRecipes(baseChef, recipes, auraBonus, gameData) {
    var rule = calCustomRule.rules[0];
    var useStrongEquip = $("#chk-unultimated-use-strong-equip").prop("checked");
    
    // baseChef 已经是不含厨具加成的基础厨师
    var chefWithAura = auraBonus ? applySkillBonusToChef(baseChef, auraBonus) : baseChef;
    
    var notGodIndices = [];
    for (var i = 0; i < recipes.length; i++) {
        var diff = calculateSkillDiffForQuery(chefWithAura, recipes[i], 4);
        if (diff.value > 0) {
            notGodIndices.push(i);
        }
    }
    
    if (notGodIndices.length === 0) {
        return null;
    }
    
    return findEquipForNotGodRecipes(baseChef, recipes, notGodIndices, auraBonus, rule.equips, useStrongEquip);
}

// ==================== 清空功能 ====================

/**
 * 清空场上所有已选的厨师、厨具、调料、菜谱
 */
function clearAllSelectedOnField(gameData) {
    var rule = calCustomRule.rules[0];
    if (!rule || !rule.custom) return;
    
    for (var i = 0; i < 3; i++) {
        setCustomChef(0, i, null);
        setCustomEquip(0, i, null);
        setCustomCondiment(0, i, null, gameData);
        for (var j = 0; j < 3; j++) {
            setCustomRecipe(0, i, j, null);
        }
    }
    
    calCustomResults(gameData);
}


/**
 * 获取修炼任务剩余需要的份数
 * @param ruleIndex - 规则索引
 * @param chefIndex - 厨师位置索引
 * @param recipeIndex - 当前要设置的菜谱位置索引
 * @param chefId - 厨师ID
 * @returns 剩余需要的份数，如果没有修炼任务要求则返回null
 */
function getQuestRemainingQuantity(ruleIndex, chefIndex, recipeIndex, chefId) {
    console.log("[修炼份数] getQuestRemainingQuantity called:", ruleIndex, chefIndex, recipeIndex, chefId);
    
    // 确保recipeIndex是数字
    recipeIndex = Number(recipeIndex);
    
    // 获取厨师的第一个修炼任务
    var quest = getChefFirstUltimateQuestForCultivation(chefId);
    
    if (!quest || !quest.conditions) {
        console.log("[修炼份数] 没有找到修炼任务");
        return null;
    }
    
    // 获取任务要求的份数
    var requiredQuantity = 0;
    for (var c = 0; c < quest.conditions.length; c++) {
        if (quest.conditions[c].num) {
            requiredQuantity = quest.conditions[c].num;
            break;
        }
    }
    
    console.log("[修炼份数] 任务要求份数:", requiredQuantity);
    
    // 如果任务没有份数要求，返回null
    if (requiredQuantity <= 0) {
        return null;
    }
    
    // 计算该厨师已分配的菜谱份数（不包括当前要设置的位置）
    var rule = calCustomRule.rules[ruleIndex];
    if (!rule || !rule.custom || !rule.custom[chefIndex]) {
        console.log("[修炼份数] 没有找到rule或custom数据，返回全部要求份数:", requiredQuantity);
        return requiredQuantity;
    }
    
    var customData = rule.custom[chefIndex];
    var recipes = customData.recipes || [];
    var allocatedQuantity = 0;
    
    console.log("[修炼份数] 菜谱数量:", recipes.length, "当前位置:", recipeIndex);
    
    for (var i = 0; i < recipes.length; i++) {
        // 跳过当前要设置的位置
        if (i === recipeIndex) {
            console.log("[修炼份数] 跳过当前位置:", i);
            continue;
        }
        
        if (recipes[i] && recipes[i].data && recipes[i].quantity > 0) {
            var qty = Number(recipes[i].quantity);
            console.log("[修炼份数] 位置", i, "菜谱:", recipes[i].data.name, "份数:", recipes[i].quantity, "转换后:", qty);
            allocatedQuantity += qty;
        }
    }
    
    console.log("[修炼份数] 已分配份数:", allocatedQuantity, "剩余需要:", requiredQuantity - allocatedQuantity);
    
    // 计算剩余需要的份数
    var remaining = requiredQuantity - allocatedQuantity;
    
    // 确保不返回负数
    return Math.max(0, remaining);
}

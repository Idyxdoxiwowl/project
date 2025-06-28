router.get('/settings', ensureSuperAdmin, async (req, res) => {
  const tokenSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
  const secretSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_SECRET' } });
  const chatIdSetting = await Setting.findOne({ where: { key: 'TELEGRAM_CHAT_ID' } });
  res.render('admin/settings', {
    title: 'Settings',
    user: req.user,
    token: tokenSetting ? tokenSetting.value : '',
    secret: secretSetting ? secretSetting.value : '',
    chatId: chatIdSetting ? chatIdSetting.value : '',
    layout: 'admin-layout'
  });
});

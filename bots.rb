require_relative('galizabot')

Galizabot.new('galizalizaliza') do |bot|
  bot.access_token = TwitterOAuthData.options_twitter[:access_token]
  bot.access_token_secret = TwitterOAuthData.options_twitter[:access_token_secret]
end
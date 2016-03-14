require 'rake/testtask'
require_relative 'galizabot'

Rake::TestTask.new do |t|
  t.test_files = FileList['test/test*.rb']
  t.verbose = true
end

task :dump_new_search_results do
  Galizabot.new('galizalizaliza') do |bot|
    bot.access_token = TwitterOAuthData.options_twitter[:access_token]
    bot.access_token_secret = TwitterOAuthData.options_twitter[:access_token_secret]
    bot.dump_custom_search
    exit 0
  end
end

task :generate_model_samples do
  Galizabot.new('galizalizaliza') do |bot|
    bot.access_token = TwitterOAuthData.options_twitter[:access_token]
    bot.access_token_secret = TwitterOAuthData.options_twitter[:access_token_secret]
    bot.generate_model_samples
    exit 0
  end
end

task :default => [:test]
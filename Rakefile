require 'rake/testtask'
require_relative 'src/twitter_dump_search'

Rake::TestTask.new do |t|
  t.test_files = FileList['test/test*.rb']
  t.verbose = true
end

task :gz_hour do
  TwitterDumpSearch.new.tweet_gz_hour
end

task :rt_gz_gl do
  TwitterDumpSearch.new(:loops => 1, :min_time => Time.new - 60 * 60 * 1, :starting_id => Integer::MAX, :retweet => true).dump_user_tweets(ENV['RETWEET_ACCOUNT'])
end

task :default => [:test]
require 'rake/testtask'
require_relative 'src/twitter_dump_search'

client = TwitterDumpSearch.new

Rake::TestTask.new do |t|
  t.test_files = FileList['test/test*.rb']
  t.verbose = true
end

task :gz_hour do
  client.tweet_gz_hour
end

task :default => [:test]
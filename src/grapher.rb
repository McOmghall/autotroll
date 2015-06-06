# encoding: UTF-8

["anemone", "neo4j", "./models/page", "./config/neo4j_db_data"].each {|lib| require lib}

Neo4j::Session.open(Config::Neo4j.session_type, Config::Neo4j.session_path, Config::Neo4j.session_options)

exclusions = [
      /Especial:/, 
      /Archivo:/,
      /Ayuda:/,
      /Anexo:/
    ]

Anemone.crawl(URI.encode("http://es.wikipedia.org/wiki/España"), options = {:depth_limit => 5}) do |anemone|
  anemone.skip_links_like exclusions 

  anemone.on_every_page do |page|
    puts "Saving #{page.url}"
    
    page_save = Page.find_or_create_by(:name => page.url.to_s)

    page.links.each do |link|
      puts "    -> Adding #{link}"

      link_new = Page.find_or_create_by(:name => link.to_s)

      page_save.pages << link_new
    end

    puts "Closing #{page.url}"
    page_save.save

    puts "Saved #{page.url}"
  end
end
